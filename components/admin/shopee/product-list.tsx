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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw, Zap, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
    id: string
    shopeeItemId: string
    name: string
    sku: string | null
    price: string
    stock: number
    status: string
    isAutoBump: boolean
    lastBumpedAt: string | null
}

export function ProductList() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [boosting, setBoosting] = useState<string | null>(null)
    const [isSandbox, setIsSandbox] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts(silent = false) {
        try {
            if (!silent) setLoading(true)
            const res = await fetch("/api/shopee/products")
            const data = await res.json()
            if (res.ok) {
                setProducts(data.products || [])
                setIsSandbox(data.isSandbox)
            } else {
                if (!silent) setError(data.error || "Failed to fetch products")
            }
        } catch (err) {
            if (!silent) setError("Failed to load products")
        } finally {
            if (!silent) setLoading(false)
        }
    }

    async function handleSync() {
        setSyncing(true)
        try {
            const res = await fetch("/api/shopee/sync", {
                method: "POST",
                body: JSON.stringify({ type: "products" })
            })
            if (res.ok) {
                await fetchProducts()
            } else {
                alert("Sync failed")
            }
        } catch (err) {
            alert("Sync error")
        } finally {
            setSyncing(false)
        }
    }

    async function toggleAutoBump(itemId: string, current: boolean) {
        // Optimistic update
        setProducts(products.map(p =>
            p.shopeeItemId === itemId ? { ...p, isAutoBump: !current } : p
        ))

        try {
            const res = await fetch("/api/shopee/products/auto-bump", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, enabled: !current })
            })

            if (!res.ok) {
                throw new Error("Failed to update")
            }
        } catch (err) {
            // Revert on error
            setProducts(products.map(p =>
                p.shopeeItemId === itemId ? { ...p, isAutoBump: current } : p
            ))
            alert("Failed to update auto-bump setting")
        }
    }

    /* Live timer update */
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        // Update countdown timer every second
        const timerCallback = () => setNow(Date.now())
        const timer = setInterval(timerCallback, 1000)

        // Poll for product updates every 10 seconds to catch background auto-bumps
        const pollingCallback = () => {
            if (!syncing && !loading) {
                fetchProducts(true) // Pass true to silent load (no full generic loading state)
            }
        }
        const poller = setInterval(pollingCallback, 10000)

        return () => {
            clearInterval(timer)
            clearInterval(poller)
        }
    }, [syncing, loading])

    function getBoostRemainingTime(lastBumpedAt: string | null) {
        if (!lastBumpedAt) return 0

        const last = new Date(lastBumpedAt).getTime()
        // Sandbox: 1 minute (60000ms), Production: 4 hours (14400000ms)
        const duration = isSandbox ? 60000 : 14400000

        const diff = (last + duration) - now
        return diff > 0 ? diff : 0
    }

    function formatDuration(ms: number) {
        if (ms <= 0) return ""
        const totalSeconds = Math.floor(ms / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m ${seconds}s`
    }

    async function handleBoost(itemId: string) {
        setBoosting(itemId)
        try {
            const res = await fetch("/api/shopee/products/boost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId })
            })
            const data = await res.json()

            if (res.ok) {
                // Update local state with new lastBumpedAt
                setProducts(products.map(p =>
                    p.shopeeItemId === itemId
                        ? { ...p, lastBumpedAt: data.lastBumpedAt || new Date().toISOString() }
                        : p
                ))
                // No alert needed, button change is feedback enough
            } else {
                alert("Boost failed: " + (data.error || "Unknown error"))
            }
        } catch (err) {
            alert("Boost failed: Network error")
        } finally {
            setBoosting(null)
        }
    }

    if (loading) return <div className="py-4 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>

    if (error) return (
        <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6 text-center text-destructive flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                {error}
            </CardContent>
        </Card>
    )

    if (products.length === 0) return null

    return (
        <Card className="border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold text-foreground">
                        Shopee Products
                    </CardTitle>
                    <Badge variant="outline" className="border-success/20 bg-success/10 text-[10px] font-medium text-success uppercase tracking-wider">
                        ● Live Sync
                    </Badge>
                    {isSandbox && (
                        <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-[10px] font-medium text-orange-600 uppercase tracking-wider">
                            Sandbox
                        </Badge>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`mr-2 h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                    Sync Now
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px] text-xs font-semibold uppercase text-muted-foreground">Product ID</TableHead>
                                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Name</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Auto Bump</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Stock</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Price</TableHead>
                                <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const remainingTime = getBoostRemainingTime(product.lastBumpedAt)
                                const isBoosted = remainingTime > 0

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {product.shopeeItemId}
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[250px] truncate" title={product.name}>
                                            {product.name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={product.isAutoBump}
                                                    onCheckedChange={() => toggleAutoBump(product.shopeeItemId, product.isAutoBump)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{product.stock}</TableCell>
                                        <TableCell className="text-center">RM {parseFloat(product.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={product.status === "NORMAL" ? "border-success/20 bg-success/5 text-success" : "border-muted bg-muted text-muted-foreground"}>
                                                {product.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 px-2 transition-all w-28", // Fixed width to prevent layout shift
                                                        isBoosted
                                                            ? "bg-muted text-muted-foreground border-muted cursor-not-allowed"
                                                            : "text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                                    )}
                                                    onClick={() => handleBoost(product.shopeeItemId)}
                                                    disabled={!!boosting || isBoosted}
                                                >
                                                    {boosting === product.shopeeItemId ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                                    ) : isBoosted ? (
                                                        <span className="font-mono text-xs">{formatDuration(remainingTime)}</span>
                                                    ) : (
                                                        <>
                                                            <Zap className="h-3.5 w-3.5 mr-1" /> Boost Now
                                                        </>
                                                    )}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
