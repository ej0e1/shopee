import { NextResponse } from "next/server"
import { generateSignature } from "@/lib/shopee/signature"
import {
    SHOPEE_PARTNER_ID,
    SHOPEE_PARTNER_KEY,
    SHOPEE_REDIRECT_URL,
    SHOPEE_HOST,
} from "@/lib/shopee/config"

/**
 * GET /api/shopee/auth/redirect
 *
 * Generates the Shopee OAuth authorization URL and redirects the user.
 * Sign format: partner_id + /api/v2/shop/auth_partner + timestamp
 */
export async function GET() {
    const timestamp = Math.floor(Date.now() / 1000)
    const path = "/api/v2/shop/auth_partner"

    const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`
    console.log("[shopee-auth] base string:", baseString)

    const sign = generateSignature(SHOPEE_PARTNER_KEY, [
        SHOPEE_PARTNER_ID,
        path,
        timestamp,
    ])

    console.log("[shopee-auth] generated sign:", sign)

    const authUrl = new URL(`${SHOPEE_HOST}${path}`)
    authUrl.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
    authUrl.searchParams.set("timestamp", String(timestamp))
    authUrl.searchParams.set("sign", sign)
    authUrl.searchParams.set("redirect", SHOPEE_REDIRECT_URL)

    console.log("[shopee-auth] Full URL:", authUrl.toString())

    return NextResponse.redirect(authUrl.toString())
}
