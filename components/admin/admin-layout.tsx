"use client"
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { SidebarNav } from "@/components/admin/sidebar-nav"
import { Topbar } from "@/components/admin/topbar"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  React.useEffect(() => {
    const runAutomation = async () => {
      try {
        await fetch("/api/shopee/automation/run")
        // Notify dashboard components to refresh their data
        window.dispatchEvent(new CustomEvent("shopee:sync-complete"))
      } catch (err) {
        console.error("Automation run failed:", err)
      }
    }

    runAutomation()
    const timer = setInterval(runAutomation, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out",
          isSidebarOpen ? "pl-64" : "pl-0"
        )}
      >
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
