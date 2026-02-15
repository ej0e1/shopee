"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  XCircle,
  Link2,
  RefreshCw,
  Package,
  ClipboardList,
  Store,
  Clock,
  Hash,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConnectionStatus {
  connected: boolean
  shopId?: string
  expiresAt?: string
}

export function ShopeeIntegration() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/shopee/connection")
      const data: ConnectionStatus = await res.json()
      console.log("Shopee connection response:", data)
      setStatus(data)
    } catch (err) {
      console.error("Failed to check connection:", err)
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const handleConnect = () => {
    // Redirect to Shopee OAuth via our API route
    window.location.href = "/api/shopee/auth/redirect"
  }

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false)
    setDisconnecting(true)
    try {
      const res = await fetch("/api/shopee/disconnect", { method: "POST" })
      if (res.ok) {
        setStatus({ connected: false })
      }
    } catch (err) {
      console.error("Failed to disconnect:", err)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSync = async (type: string) => {
    setSyncing(type)
    try {
      const res = await fetch("/api/shopee/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok) {
        // Show success (you might want to convert this to a toast)
        console.log("Sync success:", data)
        alert(`Synced ${data.count} products successfully!`)
      } else {
        console.error("Sync failed:", data.error)
        alert("Sync failed: " + (data.message || data.error))
      }
    } catch (err) {
      console.error("Sync error:", err)
      alert("Sync failed: Network error")
    } finally {
      setSyncing(null)
    }
  }

  const connected = status?.connected ?? false

  // Compute token expiry info
  let tokenExpiry = ""
  let tokenExpiringIn = Infinity
  if (status?.expiresAt) {
    const expires = new Date(status.expiresAt)
    tokenExpiry = expires.toISOString().split("T")[0]
    tokenExpiringIn = Math.ceil(
      (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Checking connection…
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Connection Status */}
        <Card className="border border-border shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full",
                  connected ? "bg-success/10" : "bg-destructive/10"
                )}
              >
                {connected ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <div className="text-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold",
                    connected
                      ? "border-success/20 bg-success/10 text-success"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  )}
                >
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              {connected ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDisconnectConfirm(true)}
                  disabled={disconnecting}
                  type="button"
                >
                  {disconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={handleConnect}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Connecting..." : "Connect Shopee Account"}
                  </Button>

                  {!status?.connected && (
                    <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-100 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">💡</span>
                        <div>
                          <p className="font-semibold mb-1">Manual Authorization?</p>
                          <p className="mb-2">If you are authorizing directly from the Shopee App List, please use this exact <strong>Redirect URL</strong>:</p>
                          <code className="block bg-white border border-blue-200 p-2 rounded text-xs break-all select-all font-mono text-blue-900">
                            {process.env.NEXT_PUBLIC_APP_URL}/api/shopee/auth/callback
                          </code>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shop Info */}
        <Card className="border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Shop Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connected ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-semibold text-success">
                        Authorized
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Shop ID
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {status?.shopId || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Token Expiry
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-semibold",
                          tokenExpiringIn <= 7
                            ? "text-warning"
                            : "text-foreground"
                        )}
                      >
                        {tokenExpiry || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync("token")}
                    disabled={syncing === "token"}
                    type="button"
                  >
                    <RefreshCw
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        syncing === "token" && "animate-spin"
                      )}
                    />
                    Refresh Token
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync("products")}
                    disabled={syncing === "products"}
                    type="button"
                  >
                    <Package
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        syncing === "products" && "animate-spin"
                      )}
                    />
                    Sync Products
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync("orders")}
                    disabled={syncing === "orders"}
                    type="button"
                  >
                    <ClipboardList
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        syncing === "orders" && "animate-spin"
                      )}
                    />
                    Sync Orders
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Store className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No shop connected
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Connect your Shopee account to view shop information.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle>Disconnect Shopee Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently remove all synced data from your local dashboard, including:
              <ul className="mt-2 list-disc list-inside space-y-1 font-medium text-foreground">
                <li>Synced Products & Variants</li>
                <li>Order History & Sync Status</li>
                <li>Wallet Transaction Records</li>
              </ul>
              <p className="mt-3">
                Your Shopee Seller account itself will remain intact. You can reconnect at any time to resync your data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDisconnect()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Yes, Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
