"use client"
import { Bell, ChevronDown, Wallet, LogOut, User, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"

interface TopbarProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export function Topbar({ onToggleSidebar, isSidebarOpen }: TopbarProps) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch("/api/admin/wallet/stats")
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    window.location.replace("/login")
  }

  const name = data?.profile?.name || (data ? "Shopee Seller" : "...")
  const balance = data?.stats?.walletBalance !== undefined
    ? `RM ${data.stats.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "..."
  const initials = name !== "..." ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : ""
  const role = data?.profile?.role || (data ? "Seller Pro" : "...")

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9 text-muted-foreground"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Welcome back,
          </h2>
          <span className="text-sm font-semibold text-foreground">
            {name !== "..." ? name.split(" ")[0] : "..."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Wallet Balance */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
          <Wallet className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Balance
            </span>
            <span className="text-sm font-semibold text-foreground font-mono">
              {balance}
            </span>
          </div>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground">{role}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
