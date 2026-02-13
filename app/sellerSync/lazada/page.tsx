"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { MarketplaceConnectionCard } from "@/components/admin/marketplace/marketplace-connection-card"

export default function LazadaPage() {
    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Lazada Integration
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your Lazada store connection and data synchronization.
                    </p>
                </div>

                <MarketplaceConnectionCard
                    marketplace="Lazada"
                    status="coming"
                />
            </div>
        </AdminLayout>
    )
}
