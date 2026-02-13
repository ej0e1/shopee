"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { AutomationRules } from "@/components/admin/automation/automation-rules"

export default function AutomationPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Configure automated rules for wallet, sync, and order management.
          </p>
        </div>
        <AutomationRules />
      </div>
    </AdminLayout>
  )
}
