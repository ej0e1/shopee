import { NextResponse } from "next/server"

/**
 * GET /api/shopee/connection
 *
 * Connection is valid ONLY if an access_token exists in DB.
 * Does NOT rely on Shopee console authorization alone.
 */
export async function GET() {
    console.log("[Shopee Connection] Checking status")

    try {
        const { getValidToken } = await import("@/lib/shopee/token-database")
        const token = await getValidToken()

        if (!token) {
            console.log("[Shopee Connection] No token found")
            return NextResponse.json({ connected: false, shop_id: null })
        }

        console.log("[Shopee Connection] Active token found:", token.shopId)

        return NextResponse.json({
            connected: true,
            shop_id: token.shopId,
            expiresAt: token.expiresAt.toISOString(),
        })
    } catch (err) {
        console.error("[Shopee Connection] ERROR:", err)
        return NextResponse.json({ connected: false, shop_id: null })
    }
}
