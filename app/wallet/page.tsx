"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { WalletPageContent } from "@/components/admin/wallet/wallet-page-content"

export default function WalletPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Manage your balance, view transactions, and handle fund movements.
          </p>
        </div>
        <WalletPageContent />
      </div>
    </AdminLayout>
  )
}
