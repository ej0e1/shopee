"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { OrdersTable, ShopeeOrderData } from "@/components/admin/orders/orders-table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function ShopeeOrdersTable() {
    const [orders, setOrders] = useState<ShopeeOrderData[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await fetch("/api/shopee/orders")
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err)
        } finally {
            if (!silent) setLoading(false)
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch("/api/shopee/orders/sync", {
                method: "POST"
            })
            const data = await res.json()
            if (res.ok) {
                alert(`Synced ${data.total_synced} orders.`)
                fetchOrders()
            } else {
                alert("Sync failed: " + (data.error || "Unknown error"))
            }
        } catch (err) {
            alert("Sync failed: Network error")
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchOrders()

        // Auto-sync orders from Shopee in background when page loads
        const initialSync = async () => {
            try {
                await fetch("/api/shopee/orders/sync", {
                    method: "POST"
                })
                fetchOrders(true) // Refresh local list silently
            } catch (err) {
                console.error("Background sync failed:", err)
            }
        }
        initialSync()

        // Polling for local database refresh (5s)
        const pollTimer = setInterval(() => fetchOrders(true), 5000)

        // Background Shopee Sync every 30 seconds
        const syncTimer = setInterval(() => initialSync(), 30000)

        return () => {
            clearInterval(pollTimer)
            clearInterval(syncTimer)
        }
    }, [])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Shopee Orders
                        <Badge variant="outline" className="h-5 gap-1.5 border-success/20 bg-success/5 px-2 text-[10px] font-medium text-success">
                            <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                            Live Sync
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        View and manage all Shopee orders synced to your account.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync Orders"}
                    </Button>
                </div>
            </div>
            <OrdersTable orders={orders} loading={loading} onRefresh={() => fetchOrders()} />
        </div>
    )
}
