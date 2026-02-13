"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Wallet,
  Clock,
  TrendingUp,
  Plus,
  ArrowUpRight,
} from "lucide-react"
import { useEffect, useState } from "react"

interface Transaction {
  id: string
  date: string
  type: "Credit" | "Hold" | "Release" | "Debit"
  source: string
  referenceId: string
  amount: string
  status: "Completed" | "Pending" | "Failed"
}

const transactions: Transaction[] = [
  {
    id: "TXN001",
    date: "2026-02-11",
    type: "Hold",
    source: "Shopee",
    referenceId: "SHP-260211001",
    amount: "- RM 245.00",
    status: "Completed",
  },
  {
    id: "TXN002",
    date: "2026-02-11",
    type: "Credit",
    source: "ToyyibPay",
    referenceId: "TP-2026-0042",
    amount: "+ RM 5,000.00",
    status: "Completed",
  },
  {
    id: "TXN003",
    date: "2026-02-10",
    type: "Release",
    source: "Shopee",
    referenceId: "SHP-260210003",
    amount: "+ RM 1,200.00",
    status: "Completed",
  },
  {
    id: "TXN004",
    date: "2026-02-10",
    type: "Debit",
    source: "Stripe",
    referenceId: "STR-WD-0091",
    amount: "- RM 2,000.00",
    status: "Completed",
  },
  {
    id: "TXN005",
    date: "2026-02-09",
    type: "Hold",
    source: "Shopee",
    referenceId: "SHP-260209006",
    amount: "- RM 320.00",
    status: "Pending",
  },
  {
    id: "TXN006",
    date: "2026-02-09",
    type: "Release",
    source: "Shopee",
    referenceId: "SHP-260209005",
    amount: "+ RM 67.00",
    status: "Completed",
  },
  {
    id: "TXN007",
    date: "2026-02-08",
    type: "Credit",
    source: "Fiuu",
    referenceId: "FU-2026-0028",
    amount: "+ RM 3,500.00",
    status: "Completed",
  },
  {
    id: "TXN008",
    date: "2026-02-08",
    type: "Debit",
    source: "Stripe",
    referenceId: "STR-WD-0090",
    amount: "- RM 1,500.00",
    status: "Failed",
  },
]

function getTypeClasses(type: string) {
  switch (type) {
    case "Credit":
      return "bg-success/10 text-success border-success/20"
    case "Hold":
      return "bg-warning/10 text-warning border-warning/20"
    case "Release":
      return "bg-primary/10 text-primary border-primary/20"
    case "Debit":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return ""
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-success/10 text-success border-success/20"
    case "Pending":
      return "bg-warning/10 text-warning border-warning/20"
    case "Failed":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return ""
  }
}

// Initial cards while loading
const initialCards = [
  {
    label: "Available Balance",
    value: "...",
    icon: Wallet,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "On Hold Balance",
    value: "...",
    icon: Clock,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    label: "Total Earned",
    value: "...",
    icon: TrendingUp,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
]

export function WalletPageContent() {
  const [stats, setStats] = useState<any>(null)
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, txnsRes] = await Promise.all([
          fetch("/api/admin/wallet/stats"),
          fetch("/api/admin/wallet/transactions")
        ])
        const statsData = await statsRes.json()
        const txnsData = await txnsRes.json()
        setStats(statsData.stats)
        setTxns(txnsData.transactions)
      } catch (error) {
        console.error("Failed to fetch wallet data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const cards = [
    {
      label: "Available Balance",
      value: stats ? `RM ${stats.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "...",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "On Hold Balance",
      value: stats ? `RM ${stats.onHoldBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "...",
      icon: Clock,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      label: "Total Earned",
      value: stats ? `RM ${stats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "...",
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
                    {card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    card.iconBg
                  )}
                >
                  <card.icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button size="sm">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Funds
        </Button>
        <Button variant="outline" size="sm">
          <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
          Withdraw
        </Button>
      </div>

      {/* Transaction Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Wallet Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Source
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reference ID
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
              {txns.map((txn) => (
                <TableRow key={txn.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="pl-6 text-sm text-muted-foreground">
                    {txn.date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-semibold",
                        getTypeClasses(txn.type)
                      )}
                    >
                      {txn.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{txn.source}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {txn.referenceId}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-sm font-medium",
                      txn.amount.startsWith("+") ? "text-success" : "text-foreground"
                    )}
                  >
                    {txn.amount}
                  </TableCell>
                  <TableCell className="pr-6">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-semibold",
                        getStatusClasses(txn.status)
                      )}
                    >
                      {txn.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
