// Shopee API configuration — loaded from environment variables

export const SHOPEE_PARTNER_ID = Number(process.env.SHOPEE_PARTNER_ID || "0")
export const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || ""
export const SHOPEE_REDIRECT_URL =
    process.env.SHOPEE_REDIRECT_URL || "http://localhost:3000/api/shopee/auth/callback"

// Shopee API base URL
// Production: https://partner.shopeemobile.com/api/v2
// Sandbox:    https://partner.test-stable.shopeemobile.com/api/v2
export const SHOPEE_BASE_URL =
    process.env.SHOPEE_BASE_URL || "https://partner.shopeemobile.com/api/v2"

// Host without /api/v2 — used for auth redirect
export const SHOPEE_HOST =
    process.env.SHOPEE_HOST || "https://partner.shopeemobile.com"
