import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { itemId, enabled } = await req.json()
        if (!itemId) return NextResponse.json({ error: "Item ID is required" }, { status: 400 })

        const product = await prisma.product.update({
            where: { shopeeItemId: itemId },
            data: { isAutoBump: enabled },
        })

        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }
}
