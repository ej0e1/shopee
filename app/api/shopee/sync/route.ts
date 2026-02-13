import { NextRequest, NextResponse } from "next/server"
import { syncProducts, syncOrders } from "@/lib/shopee/sync-logic"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { type } = body

        let result
        if (type === "orders") {
            result = await syncOrders()
        } else if (type === "products") {
            result = await syncProducts()
        } else {
            // Default fallback or handle other types
            result = await syncProducts()
        }

        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        console.error("Sync Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
