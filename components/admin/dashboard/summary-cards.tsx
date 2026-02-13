"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingBag, Wallet, Clock, ClipboardList, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

const cardData = [
  {
    label: "Total Sales (Shopee)",
    value: "RM 84,230.50",
    change: "+12.5%",
    trend: "up" as const,
    icon: ShoppingBag,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "Wallet Balance",
    value: "RM 12,450.00",
    change: "+3.2%",
    trend: "up" as const,
    icon: Wallet,
    iconBg: "bg-chart-2/10",
    iconColor: "text-chart-2",
  },
  {
    label: "On Hold Balance",
    value: "RM 3,820.00",
    change: "-8.1%",
    trend: "down" as const,
    icon: Clock,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    label: "Orders Today",
    value: "47",
    change: "+24.3%",
    trend: "up" as const,
    icon: ClipboardList,
    iconBg: "bg-chart-3/10",
    iconColor: "text-chart-3",
  },
]

function SummaryCardSkeleton() {
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="mb-2 h-7 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function SummaryCards() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/shopee/dashboard/stats")
        const json = await res.json()
        if (json.summary) {
          const merged = json.summary.map((item: any, idx: number) => {
            const staticInfo = [
              { icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" },
              { icon: Wallet, color: "text-chart-2", bg: "bg-chart-2/10" },
              { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
              { icon: ClipboardList, color: "text-chart-3", bg: "bg-chart-3/10" }
            ][idx] || { icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" }

            return { ...item, ...staticInfo }
          })
          setData(merged)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for background sync completion to refresh data
    const handleSync = () => fetchData()
    window.addEventListener("shopee:sync-complete", handleSync)
    return () => window.removeEventListener("shopee:sync-complete", handleSync)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SummaryCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    )
  }

  const displayData = data.length > 0 ? data : []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {displayData.map((card) => (
        <Card key={card.label} className="border border-border shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
                  {card.value}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {card.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      card.trend === "up" ? "text-success" : "text-destructive"
                    )}
                  >
                    {card.change}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
