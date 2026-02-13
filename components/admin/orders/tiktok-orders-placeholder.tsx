"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ShoppingBag } from "lucide-react"

export function TikTokOrdersPlaceholder() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        TikTok Shop Orders
                        <Badge variant="secondary" className="h-5 bg-red-100 text-red-700 border-red-200">
                            Coming Soon
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Synchronize and manage your TikTok Shop marketplace orders.
                    </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Sync TikTok Orders
                </Button>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="h-[400px] flex flex-col items-center justify-center text-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">No TikTok Shop orders synced yet</h3>
                        <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                            Connect your TikTok Shop seller account to start syncing and managing orders directly from this dashboard.
                        </p>
                    </div>
                    <Button variant="outline" className="mt-2 border-red-200 text-red-700 hover:bg-red-50" disabled>
                        Connect TikTok Shop
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
