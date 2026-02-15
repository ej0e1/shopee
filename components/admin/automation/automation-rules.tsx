import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Wallet, ShoppingBag, Package, XCircle, RefreshCw, Bell, Zap } from "lucide-react"

interface Rule {
  id: string
  title: string
  description: string
  enabled: boolean
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

interface RuleCategory {
  label: string
  description: string
  rules: Rule[]
}

const defaultCategories: RuleCategory[] = [
  {
    label: "Shopee Automation",
    description: "Automate Shopee related tasks like bumping and syncing.",
    rules: [
      {
        id: "auto-bump",
        title: "Auto-bump products",
        description:
          "Automatically bump selected products every 4 hours (1 minute in sandbox) to maintain visibility.",
        enabled: false,
        icon: Zap,
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-500",
      },
    ],
  },
  {
    label: "Sync Automation",
    description: "Keep your data synchronized with Shopee automatically.",
    rules: [
      {
        id: "auto-sync-products",
        title: "Auto-sync products daily",
        description:
          "Sync your product catalog from Shopee every day at midnight to keep listings up to date.",
        enabled: false,
        icon: Package,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      },
      {
        id: "auto-sync-orders",
        title: "Auto-sync orders hourly",
        description:
          "Pull new and updated orders from Shopee every hour to ensure your order list is current.",
        enabled: true,
        icon: RefreshCw,
        iconBg: "bg-chart-2/10",
        iconColor: "text-chart-2",
      },
    ],
  },
  {
    label: "Order Management",
    description: "Automate common order management tasks.",
    rules: [
      {
        id: "auto-cancel-unpaid",
        title: "Auto-cancel unpaid orders",
        description:
          "Automatically cancel orders that remain unpaid after 24 hours and release any held funds.",
        enabled: false,
        icon: XCircle,
        iconBg: "bg-destructive/10",
        iconColor: "text-destructive",
      },
      {
        id: "auto-notify-shipped",
        title: "Notify on order shipped",
        description:
          "Send a notification alert when any order status changes to shipped.",
        enabled: true,
        icon: Bell,
        iconBg: "bg-chart-3/10",
        iconColor: "text-chart-3",
      },
    ],
  },
]

export function AutomationRules() {
  const [categories, setCategories] = useState(defaultCategories)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/automation/settings")
        if (res.ok) {
          const settings = await res.json()
          setCategories(prev => prev.map(cat => ({
            ...cat,
            rules: cat.rules.map(rule => ({
              ...rule,
              enabled: settings[rule.id] ?? rule.enabled
            }))
          })))
        }
      } catch (err) {
        console.error("Failed to fetch settings", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const toggleRule = async (categoryIndex: number, ruleId: string) => {
    const category = categories[categoryIndex]
    const rule = category.rules.find(r => r.id === ruleId)
    if (!rule) return

    const newEnabled = !rule.enabled

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === categoryIndex
          ? {
            ...cat,
            rules: cat.rules.map((r) =>
              r.id === ruleId ? { ...r, enabled: newEnabled } : r
            ),
          }
          : cat
      )
    )

    try {
      await fetch("/api/automation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId, enabled: newEnabled }),
      })
    } catch (err) {
      console.error("Failed to save setting", err)
      // Revert on error
      setCategories((prev) =>
        prev.map((cat, ci) =>
          ci === categoryIndex
            ? {
              ...cat,
              rules: cat.rules.map((r) =>
                r.id === ruleId ? { ...r, enabled: !newEnabled } : r
              ),
            }
            : cat
        )
      )
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading rules...</div>

  return (
    <div className="flex flex-col gap-8">
      {categories.map((category, ci) => (
        <div key={category.label} className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{category.label}</h2>
            <p className="text-xs text-muted-foreground">{category.description}</p>
          </div>
          <div className="flex flex-col gap-3">
            {category.rules.map((rule) => (
              <Card
                key={rule.id}
                className={cn(
                  "border border-border shadow-sm transition-all",
                  rule.enabled ? "bg-card" : "bg-muted/30 opacity-75"
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      rule.iconBg
                    )}
                  >
                    <rule.icon className={cn("h-5 w-5", rule.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(ci, rule.id)}
                    aria-label={`Toggle ${rule.title}`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

