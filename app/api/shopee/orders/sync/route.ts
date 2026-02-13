import { NextRequest, NextResponse } from "next/server"
import { syncOrders } from "@/lib/shopee/sync-logic"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const { orderSn } = body

        const result = await syncOrders(orderSn ? [orderSn] : undefined)
        return NextResponse.json({
            success: true,
            ...result,
            total_synced: result.count,
            orders: result.orders
        })
    } catch (error: any) {
        console.error("[Shopee Orders Sync Error]", error)
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 })
    }
}
