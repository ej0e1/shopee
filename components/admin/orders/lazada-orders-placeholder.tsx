"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ShoppingBag } from "lucide-react"

export function LazadaOrdersPlaceholder() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Lazada Orders
                        <Badge variant="secondary" className="h-5 bg-purple-100 text-purple-700 border-purple-200">
                            Coming Soon
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Synchronize and manage your Lazada marketplace orders.
                    </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Sync Lazada Orders
                </Button>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="h-[400px] flex flex-col items-center justify-center text-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">No Lazada orders synced yet</h3>
                        <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                            Connect your Lazada seller account to start syncing and managing orders directly from this dashboard.
                        </p>
                    </div>
                    <Button variant="outline" className="mt-2 border-purple-200 text-purple-700 hover:bg-purple-50" disabled>
                        Connect Lazada Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
