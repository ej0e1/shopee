import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncWallet, syncShopInfo } from "@/lib/shopee/sync-logic"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Sync wallet data from Shopee
        await syncWallet().catch(err => console.error("Wallet Sync error:", err))

        const profile = await (prisma as any).userProfile.findUnique({
            where: { id: "default_user" }
        })

        const transactions = await (prisma as any).walletTransaction.findMany({
            orderBy: { date: 'desc' }
        })

        const releasedTransactions = transactions
            .filter((t: any) => t.type === "Release" && t.status === "Completed")
            .reduce((acc: number, t: any) => acc + t.amount, 0)

        const onHoldTransactions = transactions
            .filter((t: any) => t.type === "Hold")
            .reduce((acc: number, t: any) => acc + t.amount, 0)

        const totalEarnedTransactions = transactions
            .filter((t: any) => t.status === "Completed")
            .reduce((acc: number, t: any) => acc + t.amount, 0)

        // Dashboard Alignment: If transactions table is empty, fall back to orders simulation
        let walletBalance = releasedTransactions
        let onHoldBalance = onHoldTransactions
        let totalEarned = profile?.totalEarned || totalEarnedTransactions

        if (transactions.length === 0) {
            console.log("[Wallet Stats] Falling back to orders simulation...")
            const orders = await (prisma as any).shopeeOrder.findMany({
                where: { status: { not: "CANCELLED" } },
                select: { totalAmount: true, status: true }
            })

            walletBalance = orders
                .filter((o: any) => o.status === "COMPLETED" || o.status === "TO_CONFIRM_RECEIVE")
                .reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0)

            onHoldBalance = orders
                .filter((o: any) => ["READY_TO_SHIP", "PROCESSED", "SHIPPED", "TO_SHIP"].includes(o.status))
                .reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0)

            totalEarned = walletBalance
        }

        return NextResponse.json({
            profile: {
                name: profile?.name || "Shopee Seller",
                role: profile?.role || "Seller Pro",
                totalEarned
            },
            stats: {
                walletBalance,
                onHoldBalance,
                totalEarned
            }
        })
    } catch (error: any) {
        console.error("Wallet Stats Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
