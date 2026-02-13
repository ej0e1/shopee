"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Building2, Key, Loader2 } from "lucide-react"

export default function SettingsPage() {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/admin/profile")
        if (res.ok) {
          const data = await res.json()
          setName(data.name || "")
          setRole(data.role || "")
        }
      } catch (err) {
        console.error("Failed to fetch profile", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      })
      if (res.ok) {
        alert("Profile updated successfully!")
      } else {
        alert("Failed to update profile")
      }
    } catch (err) {
      alert("Error saving profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, API keys, and platform preferences.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl">
            {/* Profile */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                      Display Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Shopee Seller"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="role" className="text-xs font-medium text-muted-foreground">
                      Role
                    </Label>
                    <Input
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Seller Pro"
                    />
                  </div>
                </div>
                <Button size="sm" className="w-fit" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Business (Placeholder - can be implemented later) */}
            <Card className="border border-border shadow-sm opacity-60 grayscale-[0.5]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="business" className="text-xs font-medium text-muted-foreground">
                      Business Name
                    </Label>
                    <Input id="business" defaultValue="Ahmad Electronics MY" disabled />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ssm" className="text-xs font-medium text-muted-foreground">
                      SSM Number
                    </Label>
                    <Input id="ssm" defaultValue="SSM-2024-001234" disabled />
                  </div>
                </div>
                <Button size="sm" className="w-fit" disabled>Update</Button>
              </CardContent>
            </Card>

            {/* API Keys (Placeholder) */}
            <Card className="border border-border shadow-sm opacity-60 grayscale-[0.5]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shopee-key" className="text-xs font-medium text-muted-foreground">
                    Shopee Partner Key
                  </Label>
                  <Input id="shopee-key" type="password" defaultValue="sk_live_xxxxxxxxxxxx" disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shopee-secret" className="text-xs font-medium text-muted-foreground">
                    Shopee Partner Secret
                  </Label>
                  <Input id="shopee-secret" type="password" defaultValue="ss_live_xxxxxxxxxxxx" disabled />
                </div>
                <Separator />
                <Button size="sm" variant="outline" className="w-fit bg-transparent" disabled>Regenerate Keys</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
