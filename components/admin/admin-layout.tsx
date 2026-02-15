"use client"
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { SidebarNav } from "@/components/admin/sidebar-nav"
import { Topbar } from "@/components/admin/topbar"

import { useIsMobile } from "@/components/ui/use-mobile"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Set initial state once isMobile is determined
  React.useEffect(() => {
    if (isMobile !== undefined) {
      setIsSidebarOpen(!isMobile)
    }
  }, [isMobile])

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
          isSidebarOpen ? "md:pl-64" : "pl-0"
        )}
      >
        <Topbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
