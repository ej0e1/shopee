import { NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

/**
 * Helper to call Shopee API with correct signature
 */
async function callShopee(path: string, params: Record<string, any>, shopId: number, accessToken: string, method: "GET" | "POST" = "GET") {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = generateSignature(SHOPEE_PARTNER_KEY, [
        SHOPEE_PARTNER_ID, path, timestamp, accessToken, shopId
    ])

    const url = new URL(`${SHOPEE_HOST}${path}`)
    url.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
    url.searchParams.set("timestamp", String(timestamp))
    url.searchParams.set("access_token", accessToken)
    url.searchParams.set("shop_id", String(shopId))
    url.searchParams.set("sign", sign)

    const options: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" }
    }

    if (method === "GET") {
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, String(params[key]))
        })
    } else {
        options.body = JSON.stringify(params)
    }

    const res = await fetch(url.toString(), options)
    return res
}

export async function POST(req: Request) {
    try {
        const { orderSn, packageNumber } = await req.json()
        if (!orderSn) {
            return NextResponse.json({ error: "orderSn is required" }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "Shopee account not connected or token expired" }, { status: 401 })
        }
        const { shopId, accessToken } = token

        // ── Step 1: Create Shipping Document Task ─────────────────────
        console.log(`[Waybill] Creating doc task for ${orderSn}...`)
        const createRes = await callShopee(
            "/api/v2/logistics/create_shipping_document",
            {
                order_list: [{
                    order_sn: orderSn,
                    package_number: packageNumber || undefined
                }]
            },
            Number(shopId), accessToken, "POST"
        )
        const createData = await createRes.json()

        if (createData.error && createData.error !== "") {
            return NextResponse.json({
                error: `Create shipping document failed: ${createData.message || createData.error}`,
                detail: createData
            }, { status: 400 })
        }

        // ── Step 2: Poll for result (Wait up to 5 seconds) ────────────
        console.log("[Waybill] Polling for result...")
        let attempts = 0
        let isReady = false

        while (attempts < 5 && !isReady) {
            await new Promise(r => setTimeout(r, 1000))
            const resultRes = await callShopee(
                "/api/v2/logistics/get_shipping_document_result",
                {
                    order_list: [{
                        order_sn: orderSn,
                        package_number: packageNumber || undefined
                    }]
                },
                Number(shopId), accessToken, "POST"
            )
            const resultData = await resultRes.json()
            const item = resultData.response?.result_list?.[0]

            if (item?.shipping_document_status === "READY" || item?.status === "READY") {
                isReady = true
            }
            attempts++
        }

        if (!isReady) {
            return NextResponse.json({
                error: "Waybill is being generated, please try again in a moment.",
            }, { status: 202 })
        }

        // ── Step 3: Download Shipping Document ────────────────────────
        console.log("[Waybill] Downloading...")
        const downloadRes = await callShopee(
            "/api/v2/logistics/download_shipping_document",
            {
                order_list: [{
                    order_sn: orderSn,
                    package_number: packageNumber || undefined
                }]
            },
            Number(shopId), accessToken, "POST"
        )

        if (!downloadRes.ok) {
            const errData = await downloadRes.json()
            return NextResponse.json({
                error: `Download failed: ${errData.message || errData.error}`,
                detail: errData
            }, { status: 400 })
        }

        // Forward the PDF stream
        const pdfBlob = await downloadRes.blob()
        return new NextResponse(pdfBlob, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="waybill-${orderSn}.pdf"`
            }
        })

    } catch (error: any) {
        console.error("[Waybill API] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
