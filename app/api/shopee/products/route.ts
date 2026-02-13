import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

import { SHOPEE_HOST } from "@/lib/shopee/config"

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { shopeeItemId: "desc" }
        })
        const isSandbox = SHOPEE_HOST.includes("sandbox")
        return NextResponse.json({ products, isSandbox })
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }
}
