"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle2,
    XCircle,
    Clock,
    Link2,
    Hash,
    Store,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketplaceConnectionCardProps {
    marketplace: "Shopee" | "Lazada" | "TikTok"
    status: "connected" | "disconnected" | "coming"
    shopId?: string
    tokenExpiry?: string
}

export function MarketplaceConnectionCard({
    marketplace,
    status,
    shopId,
    tokenExpiry,
}: MarketplaceConnectionCardProps) {
    const isComing = status === "coming"
    const isConnected = status === "connected"

    // Brand colors
    const brandColors = {
        Shopee: "bg-orange-500",
        Lazada: "bg-blue-600",
        TikTok: "bg-[#fe2c55]", // TikTok subtle red accent
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Connection Status Card */}
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
                                    isConnected ? "bg-success/10" : "bg-muted/10",
                                    isComing && "opacity-50"
                                )}
                            >
                                {isConnected ? (
                                    <CheckCircle2 className="h-8 w-8 text-success" />
                                ) : (
                                    <XCircle className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <div className="text-center">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-xs font-semibold",
                                        isConnected
                                            ? "border-success/20 bg-success/10 text-success"
                                            : "border-muted/20 bg-muted/10 text-muted-foreground"
                                    )}
                                >
                                    {isComing ? "Coming Soon" : isConnected ? "Connected" : "Disconnected"}
                                </Badge>
                            </div>
                            <Button
                                className={cn("w-full", !isConnected && !isComing && "bg-foreground text-background")}
                                variant={isConnected ? "outline" : "default"}
                                disabled={isComing}
                            >
                                <Link2 className="mr-2 h-4 w-4" />
                                Connect {marketplace} Account
                            </Button>
                            {isComing && (
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                                    Integration Coming Soon
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Shop Information Card */}
                <Card className="border border-border shadow-sm lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">
                            Shop Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                                    <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Status
                                        </p>
                                        <p className={cn(
                                            "mt-1 text-sm font-semibold",
                                            isConnected ? "text-success" : "text-muted-foreground"
                                        )}>
                                            {isConnected ? "Authorized" : "Not Authorized"}
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
                                            {shopId || "—"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Token Expiry
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {tokenExpiry || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Badges/Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-3 py-1 text-[10px] uppercase font-bold tracking-widest">
                                    API Integration Coming Soon
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-1 opacity-50 grayscale pointer-events-none">
                                <Button variant="outline" size="sm">
                                    Refresh Token
                                </Button>
                                <Button variant="outline" size="sm">
                                    Sync Products
                                </Button>
                                <Button variant="outline" size="sm">
                                    Sync Orders
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
