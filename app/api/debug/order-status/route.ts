import { NextRequest, NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"
import { prisma } from "@/lib/prisma"

async function callShopee(path: string, params: Record<string, any>, shopId: number, accessToken: string) {
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
    Object.keys(params).forEach(key => url.searchParams.set(key, String(params[key])))
    const res = await fetch(url.toString())
    return res.json()
}

import { syncOrders } from "@/lib/shopee/sync-logic"

export async function GET(req: NextRequest) {
    try {
        const orderSn = req.nextUrl.searchParams.get("orderSn")
        const doSync = req.nextUrl.searchParams.get("sync") === "true"

        if (!orderSn) return NextResponse.json({ error: "orderSn required" })

        if (doSync) {
            await syncOrders([orderSn])
        }

        const token = await getValidToken()
        if (!token) return NextResponse.json({ error: "No token" })

        // DB Status
        const dbOrder = await prisma.shopeeOrder.findUnique({
            where: { orderSn },
            select: { orderSn: true, status: true, raw: true }
        })

        // Shopee Status
        const shopeeRes = await callShopee(
            "/api/v2/order/get_order_detail",
            { order_sn_list: orderSn, response_optional_fields: "order_status,tracking_number,package_list" },
            Number(token.shopId),
            token.accessToken
        )

        const order = shopeeRes.response?.order_list?.[0]
        const simplifiedShopee = order ? {
            orderSn: order.order_sn,
            status: order.order_status,
            trackingNumber: order.tracking_number,
            packageTracking: order.package_list?.[0]?.tracking_number,
            shippingCarrier: order.shipping_carrier,
            updateTime: order.update_time
        } : shopeeRes

        return NextResponse.json({
            db: dbOrder,
            shopee: simplifiedShopee
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
