import { NextRequest, NextResponse } from "next/server"
import { generateSignature } from "@/lib/shopee/signature"
import {
    SHOPEE_PARTNER_ID,
    SHOPEE_PARTNER_KEY,
    SHOPEE_BASE_URL,
} from "@/lib/shopee/config"

/**
 * GET /api/shopee/auth/callback
 *
 * Shopee redirects here after user authorizes the app.
 * Receives `code` and `shop_id` as query params.
 * Exchanges the code for access_token + refresh_token.
 * Connection is valid ONLY after successful token exchange + DB save.
 */
export async function GET(request: NextRequest) {
    console.log("[Shopee OAuth] Callback hit")
    console.log("[Shopee OAuth] Query params:", request.url)

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const shopId = searchParams.get("shop_id")

    console.log("[Shopee OAuth] Params — code:", code ? "present" : "missing", "shop_id:", shopId)

    if (!code || !shopId) {
        console.error("[Shopee OAuth] ERROR: Missing code or shop_id")
        return NextResponse.json(
            { error: "Missing code or shop_id" },
            { status: 400 }
        )
    }

    try {
        // Generate signature for token exchange
        const timestamp = Math.floor(Date.now() / 1000)
        const path = "/api/v2/auth/token/get"

        const sign = generateSignature(SHOPEE_PARTNER_KEY, [
            SHOPEE_PARTNER_ID,
            path,
            timestamp,
        ])

        const tokenUrl = new URL(`${SHOPEE_BASE_URL}/auth/token/get`)
        tokenUrl.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
        tokenUrl.searchParams.set("timestamp", String(timestamp))
        tokenUrl.searchParams.set("sign", sign)

        console.log("[Shopee OAuth] Calling token exchange endpoint...")

        const response = await fetch(tokenUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code,
                partner_id: SHOPEE_PARTNER_ID,
                shop_id: Number(shopId),
            }),
        })

        const data = await response.json()

        if (data.error) {
            console.error("[Shopee OAuth] ERROR: Token exchange failed —", data.error, data.message)
            return NextResponse.json(
                { error: data.error, message: data.message },
                { status: 400 }
            )
        }

        console.log("[Shopee OAuth] Token exchange success")
        console.log("[Shopee OAuth] shop_id:", shopId)

        // Save token to database
        const { saveToken } = await import("@/lib/shopee/token-database")
        const expiresAt = new Date(Date.now() + data.expire_in * 1000)

        const saved = await saveToken({
            shopId: String(shopId),
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expireIn: data.expire_in,
            expiresAt,
        })

        console.log("[Shopee OAuth] Token saved successfully")

        // Redirect back to the Shopee integration page
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        return NextResponse.redirect(`${appUrl}`)
    } catch (err) {
        console.error("[Shopee OAuth] Token exchange failed:", err)
        return NextResponse.json(
            { error: "token_exchange_failed", message: String(err) },
            { status: 500 }
        )
    }
}
