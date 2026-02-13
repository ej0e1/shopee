"use client"

import { useEffect, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function getStatusLabel(shopeeStatus: string): string {
  switch (shopeeStatus) {
    case "READY_TO_SHIP":
    case "PROCESSED":
      return "To Ship"
    case "SHIPPED":
      return "Shipping"
    case "TO_CONFIRM_RECEIVE":
    case "COMPLETED":
      return "Completed"
    case "CANCELLED":
    case "IN_CANCEL":
      return "Cancelled"
    default:
      return shopeeStatus
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "To Ship":
      return "bg-warning/10 text-warning border-warning/20"
    case "Shipping":
      return "bg-primary/10 text-primary border-primary/20"
    case "Completed":
      return "bg-success/10 text-success border-success/20"
    case "Cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return ""
  }
}

function TableSkeleton() {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`row-${i}`} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentOrders() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/shopee/dashboard/stats")
        const json = await res.json()
        if (json.recentOrders) {
          setOrders(json.recentOrders)
        }
      } catch (err) {
        console.error("Failed to fetch recent orders:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Refresh when sync completes
    const handleSync = () => fetchOrders()
    window.addEventListener("shopee:sync-complete", handleSync)
    return () => window.removeEventListener("shopee:sync-complete", handleSync)
  }, [])

  if (loading) return <TableSkeleton />

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          Latest Shopee Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Order ID
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const label = getStatusLabel(order.status)
              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <TableCell className="pl-6 font-mono text-sm font-medium text-foreground">
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[11px] font-semibold", getStatusClasses(label))}
                    >
                      {label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 font-mono text-sm text-foreground text-right">
                    {order.amount}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
