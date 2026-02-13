import { NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

export async function POST(req: Request) {
    try {
        const { orderSn, packages } = await req.json()
        if (!orderSn || !packages || packages.length < 2) {
            return NextResponse.json({
                error: "orderSn and at least 2 packages are required"
            }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "No valid Shopee token" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken
        const timestamp = Math.floor(Date.now() / 1000)

        const path = "/api/v2/order/split_order"
        const sign = generateSignature(SHOPEE_PARTNER_KEY, [
            SHOPEE_PARTNER_ID, path, timestamp, accessToken, shopId
        ])

        const url = new URL(`${SHOPEE_HOST}${path}`)
        url.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
        url.searchParams.set("timestamp", String(timestamp))
        url.searchParams.set("access_token", accessToken)
        url.searchParams.set("shop_id", String(shopId))
        url.searchParams.set("sign", sign)

        const body = {
            order_sn: orderSn,
            package_list: packages.map((pkg: any) => ({
                item_list: pkg.items.map((item: any) => ({
                    item_id: item.item_id,
                    model_id: item.model_id || 0
                }))
            }))
        }

        const res = await fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        const data = await res.json()

        if (data.error) {
            return NextResponse.json({
                error: "Failed to split order",
                detail: data
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: `Order ${orderSn} split successfully`,
            data
        })

    } catch (error: any) {
        console.error("[Split Order] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
