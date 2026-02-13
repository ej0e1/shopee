"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { ShopeeIntegration } from "@/components/admin/shopee/shopee-integration"
import { ProductList } from "@/components/admin/shopee/product-list"

export default function ShopeePage() {
    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Shopee Integration
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your Shopee store connection, tokens, and data sync.
                    </p>
                </div>
                <ShopeeIntegration />
                <ProductList />
            </div>
        </AdminLayout>
    )
}
