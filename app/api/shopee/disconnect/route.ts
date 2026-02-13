import { NextResponse } from "next/server"

/**
 * POST /api/shopee/disconnect
 *
 * Deletes all Shopee tokens from DB.
 * After this, connection status will return false.
 */
export async function POST() {
    console.log("[Shopee Connection] Disconnect requested")

    try {
        const { deleteAllTokens } = await import("@/lib/shopee/token-database")
        const result = await deleteAllTokens()

        console.log("[Shopee Connection] Token deleted — rows removed:", result.count)

        return NextResponse.json({ success: true, deleted: result.count })
    } catch (err) {
        console.error("[Shopee Connection] ERROR during disconnect:", err)
        return NextResponse.json(
            { error: "disconnect_failed", message: String(err) },
            { status: 500 }
        )
    }
}
