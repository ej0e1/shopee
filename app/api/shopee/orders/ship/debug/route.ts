import { NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

/**
 * GET /api/shopee/orders/ship/debug?orderSn=xxx
 * Debug endpoint to see the raw get_shipping_parameter response
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const orderSn = url.searchParams.get("orderSn")
        if (!orderSn) {
            return NextResponse.json({ error: "orderSn query param is required" }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "No valid Shopee token" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken
        const timestamp = Math.floor(Date.now() / 1000)

        const path = "/api/v2/logistics/get_shipping_parameter"
        const sign = generateSignature(SHOPEE_PARTNER_KEY, [
            SHOPEE_PARTNER_ID, path, timestamp, accessToken, shopId
        ])

        const apiUrl = new URL(`${SHOPEE_HOST}${path}`)
        apiUrl.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
        apiUrl.searchParams.set("timestamp", String(timestamp))
        apiUrl.searchParams.set("access_token", accessToken)
        apiUrl.searchParams.set("shop_id", String(shopId))
        apiUrl.searchParams.set("sign", sign)
        apiUrl.searchParams.set("order_sn", orderSn)

        const res = await fetch(apiUrl.toString(), {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
        const data = await res.json()

        return NextResponse.json({
            orderSn,
            currentTimestamp: timestamp,
            currentTime: new Date().toISOString(),
            shopeeResponse: data
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
