import { prisma } from "@/lib/prisma"

export interface ShopeeTokenRecord {
    shopId: string
    accessToken: string
    refreshToken: string
    expireIn: number
    expiresAt: Date
}

/**
 * Save or update a Shopee token for a given shop.
 */
export async function saveToken(data: ShopeeTokenRecord) {
    console.log("[shopee-token-db] Saving token for shop:", data.shopId)
    return prisma.shopeeToken.upsert({
        where: { shopId: data.shopId },
        create: {
            shopId: data.shopId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        },
        update: {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
            updatedAt: new Date(),
        },
    })
}

/**
 * Get the first valid (non-expired) token. Returns null if none found.
 */
export async function getValidToken() {
    const token = await prisma.shopeeToken.findFirst({
        orderBy: { updatedAt: "desc" },
    })
    if (!token) return null

    // Check expiry — if expired but we have refresh token, try to refresh
    if (new Date() >= token.expiresAt) {
        console.log("[shopee-token-db] Token expired for shop:", token.shopId, "attempting refresh...")
        try {
            const refreshed = await refreshShopeeToken(token.refreshToken, Number(token.shopId))
            if (refreshed) return refreshed
        } catch (err) {
            console.error("[shopee-token-db] Refresh failed:", err)
        }
        return null
    }

    return token
}

/**
 * Refresh Shopee Token
 */
async function refreshShopeeToken(refreshToken: string, shopId: number) {
    const { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_BASE_URL } = await import("./config")
    const { generateSignature } = await import("./signature")

    const timestamp = Math.floor(Date.now() / 1000)
    const path = "/api/v2/auth/access_token/get"
    const sign = generateSignature(SHOPEE_PARTNER_KEY, [SHOPEE_PARTNER_ID, path, timestamp])

    const url = new URL(`${SHOPEE_BASE_URL}/auth/access_token/get`)
    url.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
    url.searchParams.set("timestamp", String(timestamp))
    url.searchParams.set("sign", sign)

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            refresh_token: refreshToken,
            partner_id: SHOPEE_PARTNER_ID,
            shop_id: shopId
        })
    })

    const data = await res.json()
    if (data.error) {
        console.error("[shopee-token-db] Refresh API error:", data.error, data.message)
        return null
    }

    const expiresAt = new Date(Date.now() + data.expire_in * 1000)
    return prisma.shopeeToken.update({
        where: { shopId: String(shopId) },
        data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt
        }
    })
}

/**
 * Get token by shop ID regardless of expiry.
 */
export async function getTokenByShopId(shopId: string) {
    return prisma.shopeeToken.findUnique({ where: { shopId } })
}

/**
 * Delete token for a given shop ID.
 */
export async function deleteToken(shopId: string) {
    console.log("[shopee-token-db] Deleting token for shop:", shopId)
    return prisma.shopeeToken.delete({ where: { shopId } })
}

/**
 * Delete all tokens.
 */
export async function deleteAllTokens() {
    console.log("[shopee-token-db] Deleting all tokens")
    return prisma.shopeeToken.deleteMany()
}
