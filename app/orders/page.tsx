"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShopeeOrdersTable } from "@/components/admin/orders/shopee-orders-table"
import { LazadaOrdersPlaceholder } from "@/components/admin/orders/lazada-orders-placeholder"
import { TikTokOrdersPlaceholder } from "@/components/admin/orders/tiktok-orders-placeholder"
import { cn } from "@/lib/utils"

export default function OrdersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeMarketplace = searchParams.get("marketplace") || "shopee"

  const setActiveMarketplace = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("marketplace", val)
    router.push(`?${params.toString()}`)
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Marketplace Selection Tabs */}
        <div className="flex items-center justify-start border-b border-border pb-0">
          <Tabs
            value={activeMarketplace}
            onValueChange={setActiveMarketplace}
            className="w-full"
          >
            <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger
                value="shopee"
                className={cn(
                  "relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-6 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none",
                  "data-[state=active]:border-b-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:shadow-none"
                )}
              >
                Shopee
              </TabsTrigger>
              <TabsTrigger
                value="lazada"
                className={cn(
                  "relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-6 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none",
                  "data-[state=active]:border-b-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:shadow-none"
                )}
              >
                Lazada
              </TabsTrigger>
              <TabsTrigger
                value="tiktok"
                className={cn(
                  "relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-6 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none",
                  "data-[state=active]:border-b-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-600 data-[state=active]:shadow-none"
                )}
              >
                TikTok Shop
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conditional Rendering */}
        <div className="mt-2">
          {activeMarketplace === "shopee" && <ShopeeOrdersTable />}
          {activeMarketplace === "lazada" && <LazadaOrdersPlaceholder />}
          {activeMarketplace === "tiktok" && <TikTokOrdersPlaceholder />}
        </div>
      </div>
    </AdminLayout>
  )
}
