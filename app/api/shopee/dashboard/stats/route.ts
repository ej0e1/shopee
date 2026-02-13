import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const now = new Date()
        const todayStart = startOfDay(now)
        const todayEnd = endOfDay(now)
        const thirtyDaysAgo = startOfDay(subDays(now, 30))

        // 1. Fetch Orders Today
        const ordersTodayCount = await prisma.shopeeOrder.count({
            where: {
                createTime: {
                    gte: todayStart,
                    lte: todayEnd
                }
            }
        })

        // 2. Fetch Total Sales (Non-Cancelled)
        const orders = await prisma.shopeeOrder.findMany({
            where: {
                status: {
                    not: "CANCELLED"
                }
            },
            select: {
                totalAmount: true,
                status: true,
                createTime: true
            }
        })

        const totalSales = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)

        // 3. Wallet Balance & On Hold (Simulation based on status)
        // In a real app, we'd fetch this from Shopee Escrow API or separate Wallet table
        // For now, we simulate: Completed = Wallet, Paid/Shipped = On Hold
        const walletBalance = orders
            .filter(o => o.status === "COMPLETED" || o.status === "TO_CONFIRM_RECEIVE")
            .reduce((acc, o) => acc + (o.totalAmount || 0), 0)

        const onHoldBalance = orders
            .filter(o => ["READY_TO_SHIP", "PROCESSED", "SHIPPED", "TO_SHIP"].includes(o.status))
            .reduce((acc, o) => acc + (o.totalAmount || 0), 0)

        // 4. Recent Orders
        const recentOrders = await prisma.shopeeOrder.findMany({
            take: 6,
            orderBy: {
                createTime: 'desc'
            }
        })

        // 5. Chart Data (Last 30 days)
        const chartDataRaw = await prisma.shopeeOrder.findMany({
            where: {
                createTime: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                createTime: true
            }
        })

        // Group by day
        const groupedData: Record<string, number> = {}
        for (let i = 0; i < 30; i++) {
            const d = format(subDays(now, i), "MMM dd")
            groupedData[d] = 0
        }

        chartDataRaw.forEach(o => {
            const d = format(o.createTime, "MMM dd")
            if (groupedData[d] !== undefined) {
                groupedData[d]++
            }
        })

        const chartData = Object.entries(groupedData)
            .map(([day, orders]) => ({ day, orders }))
            .reverse()

        return NextResponse.json({
            summary: [
                {
                    label: "Total Sales (Shopee)",
                    value: `RM ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: "+0%", // Placeholder for trend
                    trend: "up"
                },
                {
                    label: "Wallet Balance",
                    value: `RM ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: "+0%",
                    trend: "up"
                },
                {
                    label: "On Hold Balance",
                    value: `RM ${onHoldBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: "+0%",
                    trend: "down"
                },
                {
                    label: "Orders Today",
                    value: ordersTodayCount.toString(),
                    change: "+0%",
                    trend: "up"
                }
            ],
            recentOrders: recentOrders.map(o => ({
                id: o.orderSn,
                status: o.status,
                amount: `RM ${o.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                walletState: ["COMPLETED", "TO_CONFIRM_RECEIVE"].includes(o.status) ? "Released" : "Hold"
            })),
            chartData
        })

    } catch (error: any) {
        console.error("Dashboard Stats Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
