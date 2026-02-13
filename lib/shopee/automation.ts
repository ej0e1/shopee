import { prisma } from "@/lib/prisma"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST, SHOPEE_BASE_URL } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"
import { syncProducts, syncOrders } from "@/lib/shopee/sync-logic"

/**
 * Helper to fetch data from Shopee
 */
async function boostItem(itemId: number, shopId: number, accessToken: string) {
    const path = "/api/v2/product/boost_item"
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

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id_list: [itemId] })
    })
    return res.json()
}

export async function runAutomationTasks() {
    try {
        // console.log("[Automation] Running check...")

        // 1. Get connection info
        const token = await getValidToken()
        if (!token) return { success: false, message: "Not connected to Shopee" }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken

        // 2. Auto-Bump Implementation
        const autoBumpSetting = await prisma.automationSetting.findUnique({ where: { id: "auto-bump" } })
        let bumpedCount = 0
        let bumpErrors = []

        console.log(`[Automation] Global Auto-Bump: ${autoBumpSetting?.enabled ? "ON" : "OFF"}`)

        if (autoBumpSetting?.enabled) {
            const productsMap = await prisma.product.findMany({
                where: { isAutoBump: true, shopId: String(shopId) },
                orderBy: { lastBumpedAt: 'asc' }
            })
            console.log(`[Automation] Found ${productsMap.length} products to bump...`)


            const now = new Date()
            const isSandbox = SHOPEE_BASE_URL.includes("sandbox") || SHOPEE_HOST.includes("sandbox")
            const BOOSTER_INTERVAL_MS = isSandbox ? 60000 : 14400000

            for (const product of productsMap) {
                if (bumpedCount >= 5) break
                const lastBump = product.lastBumpedAt ? new Date(product.lastBumpedAt) : new Date(0)
                const diff = now.getTime() - lastBump.getTime()
                if (diff >= (BOOSTER_INTERVAL_MS - 2000)) {
                    const result = await boostItem(Number(product.shopeeItemId), shopId, accessToken)
                    if (!result.error || (result.error === "error_param" && result.message?.includes("boosted"))) {
                        await prisma.product.update({ where: { id: product.id }, data: { lastBumpedAt: now } })
                        bumpedCount++
                    } else {
                        bumpErrors.push({ id: product.shopeeItemId, error: result })
                    }
                }
            }
        }

        // 3. Auto-Sync Orders (Hourly)
        let orderSyncSetting = await prisma.automationSetting.findUnique({ where: { id: "auto-sync-orders" } })
        if (!orderSyncSetting) {
            orderSyncSetting = await prisma.automationSetting.create({ data: { id: "auto-sync-orders", enabled: true } })
        }

        let orderSynced = false
        let orderError = null
        if (orderSyncSetting.enabled) {
            const lastRun = orderSyncSetting.lastRunAt ? new Date(orderSyncSetting.lastRunAt).getTime() : 0
            if (Date.now() - lastRun > 60000) { // 1 minute (Sandbox/Test Mode)
                console.log("[Automation] Running 1-minute order sync...")
                try {
                    await syncOrders()
                    await prisma.automationSetting.update({ where: { id: "auto-sync-orders" }, data: { lastRunAt: new Date() } })
                    orderSynced = true
                } catch (e: any) {
                    console.error("[Automation] Order sync failed:", e)
                    orderError = e.message
                }
            }
        }

        // 4. Auto-Sync Products (Daily)
        let productSyncSetting = await prisma.automationSetting.findUnique({ where: { id: "auto-sync-products" } })
        if (!productSyncSetting) {
            productSyncSetting = await prisma.automationSetting.create({ data: { id: "auto-sync-products", enabled: false } })
        }

        let productSynced = false
        let productError = null
        if (productSyncSetting.enabled) {
            const lastRun = productSyncSetting.lastRunAt ? new Date(productSyncSetting.lastRunAt).getTime() : 0
            if (Date.now() - lastRun > 60000) { // 1 minute (Sandbox/Test Mode)
                console.log("[Automation] Running 1-minute product sync...")
                try {
                    await syncProducts()
                    await prisma.automationSetting.update({ where: { id: "auto-sync-products" }, data: { lastRunAt: new Date() } })
                    productSynced = true
                } catch (e: any) {
                    console.error("[Automation] Product sync failed:", e)
                    productError = e.message
                }
            }
        }

        return {
            success: true,
            bump: { count: bumpedCount, errors: bumpErrors.length > 0 ? bumpErrors : undefined },
            orderSync: orderSynced ? "triggered" : (orderError || "skipped"),
            productSync: productSynced ? "triggered" : (productError || "skipped"),
            debug: {
                order: { enabled: orderSyncSetting.enabled, lastRun: orderSyncSetting.lastRunAt, diff: Date.now() - (orderSyncSetting.lastRunAt ? new Date(orderSyncSetting.lastRunAt).getTime() : 0) },
                product: { enabled: productSyncSetting.enabled, lastRun: productSyncSetting.lastRunAt, diff: Date.now() - (productSyncSetting.lastRunAt ? new Date(productSyncSetting.lastRunAt).getTime() : 0) }
            }
        }

    } catch (error: any) {
        console.error("Automation Error:", error)
        return { success: false, error: error.message || "Internal Error" }
    }
}
