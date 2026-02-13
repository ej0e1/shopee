"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { SummaryCards } from "@/components/admin/dashboard/summary-cards"
import { OrderChart } from "@/components/admin/dashboard/order-chart"
import { RecentOrders } from "@/components/admin/dashboard/recent-orders"

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your Shopee store and wallet activity.
          </p>
        </div>
        <SummaryCards />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <OrderChart />
          <RecentOrders />
        </div>
      </div>
    </AdminLayout>
  )
}
