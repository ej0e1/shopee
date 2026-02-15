import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/shopee/disconnect
 *
 * Full Shopee disconnection:
 * 1. Delete all Shopee tokens
 * 2. Delete all synced products
 * 3. Delete all Shopee orders
 * 4. Delete all Shopee-sourced wallet transactions
 * 5. Reset automation run timestamps
 * 6. Reset user profile earnings
 *
 * All wrapped in a transaction for atomicity.
 * Internal user account (UserProfile, AutomationSetting) is preserved.
 */
export async function POST() {
    console.log("[Shopee Disconnect] Disconnect requested — starting full cleanup")

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Delete all Shopee tokens
            const tokens = await tx.shopeeToken.deleteMany()
            console.log("[Shopee Disconnect] Tokens deleted:", tokens.count)

            // 2. Delete all synced products
            const products = await tx.product.deleteMany()
            console.log("[Shopee Disconnect] Products deleted:", products.count)

            // 3. Delete all Shopee orders
            const orders = await tx.shopeeOrder.deleteMany()
            console.log("[Shopee Disconnect] Orders deleted:", orders.count)

            // 4. Delete Shopee-sourced wallet transactions
            const walletTxns = await tx.walletTransaction.deleteMany({
                where: { source: "Shopee" },
            })
            console.log("[Shopee Disconnect] Wallet transactions deleted:", walletTxns.count)

            // 5. Reset automation lastRunAt so they don't skip on reconnect
            const automations = await tx.automationSetting.updateMany({
                data: { lastRunAt: null },
            })
            console.log("[Shopee Disconnect] Automation timestamps reset:", automations.count)

            // 6. Reset user profile totalEarned (since wallet data is purged)
            const profiles = await tx.userProfile.updateMany({
                data: { totalEarned: 0 },
            })
            console.log("[Shopee Disconnect] User profiles earnings reset:", profiles.count)

            return {
                tokens: tokens.count,
                products: products.count,
                orders: orders.count,
                walletTransactions: walletTxns.count,
                automationsReset: automations.count,
                profilesReset: profiles.count,
            }
        })

        console.log("[Shopee Disconnect] Full cleanup complete:", result)

        return NextResponse.json({ success: true, deleted: result })
    } catch (err) {
        console.error("[Shopee Disconnect] ERROR during disconnect:", err)
        return NextResponse.json(
            { error: "disconnect_failed", message: String(err) },
            { status: 500 }
        )
    }
}
