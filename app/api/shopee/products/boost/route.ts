import { NextRequest, NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { prisma } from "@/lib/prisma"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

/**
 * Helper to fetch data from Shopee (copied from sync route for simplicity, ideally shared)
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

    console.log(`[Shopee Boost] ${method} ${url.toString()}`)
    const res = await fetch(url.toString(), options)
    return res.json()
}

export async function POST(req: NextRequest) {
    try {
        const { itemId } = await req.json()
        if (!itemId) {
            return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "No connected Shopee shop" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken

        console.log(`Boosting item ${itemId} for Shop ID: ${shopId}`)

        const boostPath = "/api/v2/product/boost_item"
        const result = await fetchShopee(boostPath, {
            item_id_list: [Number(itemId)]
        }, shopId, accessToken, "POST")

        if (result.error) {
            console.error("Shopee Boost Error:", result)
            return NextResponse.json({
                error: result.message || "Failed to boost item",
                details: result
            }, { status: 500 })
        }

        // Update lastBumpedAt in database
        await prisma.product.update({
            where: { shopeeItemId: String(itemId) },
            data: { lastBumpedAt: new Date() }
        })

        return NextResponse.json({
            success: true,
            message: "Item boosted successfully",
            response: result.response,
            lastBumpedAt: new Date()
        })

    } catch (error) {
        console.error("Boost API Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
