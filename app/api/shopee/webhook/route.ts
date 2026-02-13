import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

/**
 * Signature validation as requested
 */
function verifyShopeeSignature(rawBody: string, signature: string) {
    const expected = crypto
        .createHmac("sha256", SHOPEE_PARTNER_KEY)
        .update(rawBody)
        .digest("hex")

    return expected === signature
}

/**
 * Helper to fetch data from Shopee (mirrored from sync route for stability)
 */
async function fetchShopee(path: string, params: any, shopId: number, accessToken: string, method: "GET" | "POST" = "POST") {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = generateSignature(SHOPEE_PARTNER_KEY, [
        SHOPEE_PARTNER_ID,
        path,
        timestamp,
        accessToken,
        shopId
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
            url.searchParams.append(key, String(params[key]))
        })
    } else {
        options.body = JSON.stringify(params)
    }

    const res = await fetch(url.toString(), options)
    return res.json()
}

export async function POST(req: Request) {
    try {
        const signature = req.headers.get("x-shopee-signature")
        const rawBody = await req.text()

        console.log("[Shopee Webhook] Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
        console.log("[Shopee Webhook] Raw Body:", rawBody)

        if (!signature) {
            console.log("[Shopee Webhook] Missing signature - returning 200 for verification")
            return NextResponse.json({ code: 0, message: "alive" })
        }

        // 2. Validate Signature
        const isValid = verifyShopeeSignature(rawBody, signature)
        console.log("[Shopee Webhook] Signature valid:", isValid)

        if (!isValid) {
            console.log("[Shopee Webhook] Invalid signature")
            // Return 200 during verification if needed, but for now 401 is safer for production
            // If verification still fails, we might need to return 200 here too
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        // 3. Parse JSON
        const body = JSON.parse(rawBody)
        console.log("[Shopee Webhook] Received:", JSON.stringify(body, null, 2))

        const { code, data } = body

        // Detect event type (Shopee API v2 push uses numeric codes or string events depending on type)
        // For order_status_update or order_create:
        if (body.code === 3 || body.code === 4) { // 3: order_status_update, 4: order_create
            const orderSn = body.data?.order_sn
            const shopId = body.shop_id

            if (orderSn && shopId) {
                console.log("[Shopee Webhook] Order updated:", orderSn)

                // Fetch full detail and upsert
                const token = await getValidToken()
                if (token && Number(token.shopId) === shopId) {
                    const detailPath = "/api/v2/order/get_order_detail"
                    const detailResponse = await fetchShopee(detailPath, {
                        order_sn_list: [orderSn],
                        response_optional_fields: "buyer_user_id,buyer_username,total_amount,item_list,order_status,create_time,tracking_number"
                    }, shopId, token.accessToken, "GET")

                    if (detailResponse.response?.order_list?.length > 0) {
                        const order = detailResponse.response.order_list[0]
                        const buyerName = order.buyer_username || order.buyer_user_id?.toString() || "Unknown"
                        const productNames = order.item_list?.map((i: any) => i.item_name).join(", ") || "No items"
                        const totalAmount = order.total_amount || 0

                        await prisma.shopeeOrder.upsert({
                            where: { orderSn: order.order_sn },
                            update: {
                                buyerName,
                                productNames,
                                totalAmount,
                                status: order.order_status,
                                createTime: new Date(order.create_time * 1000),
                                raw: order
                            },
                            create: {
                                shopId,
                                orderSn: order.order_sn,
                                buyerName,
                                productNames,
                                totalAmount,
                                status: order.order_status,
                                createTime: new Date(order.create_time * 1000),
                                raw: order
                            }
                        })
                        console.log(`[Shopee Webhook] Database updated for ${orderSn}`)
                    }
                }
            }
        }

        // 4. Return success as required by Shopee
        return NextResponse.json({
            code: 0,
            message: "success"
        })

    } catch (error: any) {
        console.error("[Shopee Webhook Error]", error)
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 })
    }
}

export async function GET() {
    console.log("[Shopee Webhook] GET Ping received")
    return NextResponse.json({ code: 0, message: "alive" })
}
