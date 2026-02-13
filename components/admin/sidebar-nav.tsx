"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Wallet,
  ArrowLeftRight,
  Zap,
  Settings,
  ChevronDown,
  Store,
  Link2,
  RefreshCw,
  Package,
} from "lucide-react"

const navSections = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        label: "Shopee",
        href: "/sellerSync/shopee",
        icon: Store,
      },
      {
        label: "Lazada",
        href: "/sellerSync/lazada",
        icon: Package,
      },
      {
        label: "TikTok Shop",
        href: "/sellerSync/tiktok",
        icon: Zap,
      },
      {
        label: "Orders",
        href: "/orders",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Wallet",
        href: "/wallet",
        icon: Wallet,
      },
      {
        label: "Transactions",
        href: "/transactions",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Automation",
        href: "/automation",
        icon: Zap,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
]

interface SidebarNavProps {
  isOpen: boolean
  onToggle: () => void
}

export function SidebarNav({ isOpen, onToggle }: SidebarNavProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Shopee Integration": true,
  })

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out border-r border-sidebar-border",
        !isOpen && "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <ShoppingBag className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
          SellerSync
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item: any) => {
                const isActive =
                  pathname === item.href ||
                  (item.children?.some((c: any) => pathname === c.href) ?? false)
                const hasChildren = !!item.children
                const isOpen = expanded[item.label]

                return (
                  <li key={item.label}>
                    {hasChildren ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.label)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>
                        {isOpen && (
                          <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                            {item.children?.map((child: any) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                                    pathname === child.href
                                      ? "text-sidebar-primary font-medium"
                                      : "hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-sidebar-foreground/40">SellerSync v1.0.0</p>
      </div>
    </aside>
  )
}
