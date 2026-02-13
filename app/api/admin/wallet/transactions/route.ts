import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const transactions = await prisma.walletTransaction.findMany({
            orderBy: { date: 'desc' }
        })

        return NextResponse.json({
            transactions: transactions.map((t: any) => ({
                id: t.id,
                date: t.date.toISOString().split('T')[0],
                type: t.type,
                source: t.source,
                referenceId: t.referenceId,
                amount: `${t.amount >= 0 ? '+ ' : '- '}RM ${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                status: t.status
            }))
        })
    } catch (error: any) {
        console.error("Wallet Transactions Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
