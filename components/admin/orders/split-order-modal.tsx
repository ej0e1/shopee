"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Package, Loader2, Scissors } from "lucide-react"

interface OrderItem {
    item_id: number
    model_id?: number
    item_name: string
    model_name?: string
    model_quantity_purchased?: number
}

interface SplitOrderModalProps {
    open: boolean
    onClose: () => void
    orderSn: string
    items: OrderItem[]
    onSuccess: () => void
}

export function SplitOrderModal({ open, onClose, orderSn, items, onSuccess }: SplitOrderModalProps) {
    const [splitting, setSplitting] = useState(false)
    // Track which items go into package 2 (everything else stays in package 1)
    const [package2Items, setPackage2Items] = useState<Set<number>>(new Set())

    const toggleItem = (idx: number) => {
        setPackage2Items(prev => {
            const next = new Set(prev)
            if (next.has(idx)) {
                next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    const pkg1Items = items.filter((_, i) => !package2Items.has(i))
    const pkg2Items = items.filter((_, i) => package2Items.has(i))
    const canSplit = pkg1Items.length > 0 && pkg2Items.length > 0

    const handleSplit = async () => {
        if (!canSplit) return
        setSplitting(true)
        try {
            const packages = [
                { items: pkg1Items.map(i => ({ item_id: i.item_id, model_id: i.model_id || 0 })) },
                { items: pkg2Items.map(i => ({ item_id: i.item_id, model_id: i.model_id || 0 })) }
            ]
            const res = await fetch("/api/shopee/orders/split", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderSn, packages })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                onSuccess()
                onClose()
            } else {
                alert("Split failed: " + (data.error || data.detail?.message || "Unknown error"))
            }
        } catch (err) {
            alert("Split failed: Network error")
        } finally {
            setSplitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <Scissors className="h-5 w-5 text-primary" />
                        Split Order
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground font-mono">#{orderSn}</p>
                </DialogHeader>

                <p className="text-sm text-muted-foreground mt-2">
                    Select items to move to <strong>Package 2</strong>. Remaining items stay in Package 1.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                    {items.map((item, idx) => (
                        <label
                            key={`${item.item_id}-${item.model_id || idx}`}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                package2Items.has(idx)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted/50"
                            )}
                        >
                            <Checkbox
                                checked={package2Items.has(idx)}
                                onCheckedChange={() => toggleItem(idx)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {item.item_name}
                                </p>
                                {item.model_name && (
                                    <p className="text-xs text-muted-foreground">
                                        Variation: {item.model_name}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                                x{item.model_quantity_purchased || 1}
                            </span>
                        </label>
                    ))}
                </div>

                <Separator className="my-3" />

                {/* Package Preview */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Package className="h-3.5 w-3.5 text-chart-2" />
                            <span className="font-semibold text-foreground">Package 1</span>
                        </div>
                        {pkg1Items.length === 0 ? (
                            <p className="text-muted-foreground italic">No items</p>
                        ) : (
                            pkg1Items.map((item, i) => (
                                <p key={i} className="text-muted-foreground truncate">{item.item_name}</p>
                            ))
                        )}
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Package className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold text-foreground">Package 2</span>
                        </div>
                        {pkg2Items.length === 0 ? (
                            <p className="text-muted-foreground italic">No items</p>
                        ) : (
                            pkg2Items.map((item, i) => (
                                <p key={i} className="text-muted-foreground truncate">{item.item_name}</p>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <Button onClick={handleSplit} disabled={splitting || !canSplit} className="min-w-[100px]">
                        {splitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Splitting...
                            </>
                        ) : (
                            "Confirm Split"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
