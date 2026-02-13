"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { WalletPageContent } from "@/components/admin/wallet/wallet-page-content"

export default function TransactionsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Full history of all wallet transactions across payment providers.
          </p>
        </div>
        <WalletPageContent />
      </div>
    </AdminLayout>
  )
}
