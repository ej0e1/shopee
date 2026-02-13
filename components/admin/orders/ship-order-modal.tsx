"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Truck, MapPin, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface ShipOrderModalProps {
    open: boolean
    onClose: () => void
    orderSn: string
    isProcessed?: boolean
    onSuccess: () => void
}

export function ShipOrderModal({ open, onClose, orderSn, isProcessed, onSuccess }: ShipOrderModalProps) {
    const [method, setMethod] = useState<"dropoff" | "pickup">("pickup")
    const [shippingData, setShippingData] = useState<any>(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!open) {
            setShippingData(null)
            setError("")
            setLoading(false)
            setStatusLoading(false)
        }
    }, [open])

    useEffect(() => {
        if (open && isProcessed && !shippingData && !loading && !statusLoading) {
            refreshStatus()
        }
    }, [open, isProcessed, shippingData])

    // Auto-refresh tracking number if missing
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (shippingData && !shippingData.trackingNumber && open) {
            timer = setTimeout(() => {
                refreshStatus()
            }, 5000)
        }
        return () => clearTimeout(timer)
    }, [shippingData, open])

    const refreshStatus = async () => {
        if (statusLoading) return
        setStatusLoading(true)
        try {
            const res = await fetch("/api/shopee/orders/pickup-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderSn })
            })
            const data = await res.json()
            if (data.success) {
                setShippingData({
                    orderSn: data.orderSn,
                    trackingNumber: data.trackingNumber,
                    packageNumber: data.packageNumber,
                    pickupInfo: data.pickupInfo,
                    trackingTimeline: data.trackingTimeline || []
                })
            }
        } catch (err) {
            console.error("Refresh failed", err)
        } finally {
            setStatusLoading(false)
        }
    }

    const handleShip = async () => {
        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/shopee/orders/ship", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderSn, pickup: method === "pickup" })
            })

            const data = await res.json()
            if (!res.ok) {
                if (data.isStateMismatch) {
                    onSuccess()
                    onClose()
                    return
                }
                throw new Error(data.error || "Failed to ship order")
            }

            setShippingData(data)
            onSuccess()
            // Don't close immediately if we have shipping data to show
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!shippingData && isProcessed) {
        return (
            <Dialog open={open} onOpenChange={() => onClose()}>
                <DialogContent className="max-w-md p-10 flex flex-col items-center justify-center bg-white border-none rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Loading Pickup Details</DialogTitle>
                    </DialogHeader>
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
                    <p className="text-gray-600 font-medium tracking-tight">Loading pickup details...</p>
                </DialogContent>
            </Dialog>
        )
    }

    if (shippingData) {
        const pickupInfo = shippingData.pickupInfo
        const address = pickupInfo?.address
        const timeSlot = pickupInfo?.timeSlot

        return (
            <Dialog open={open} onOpenChange={() => onClose()}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-none rounded-xl">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-bold text-gray-800">Pickup Details</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Tracking Number Header - Redesigned to be centered and larger */}
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Truck className="w-6 h-6 text-gray-600" />
                                </div>
                                <span className="text-2xl font-bold tracking-wider text-gray-800">
                                    {shippingData.trackingNumber || "Allocating..."}
                                </span>
                            </div>
                            {!shippingData.trackingNumber && (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    <span className="text-sm text-gray-500 italic">Waiting for tracking number...</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={refreshStatus}
                                        className="h-6 px-2 text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold ml-2"
                                    >
                                        Refresh
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Pickup Information Card */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900">Pickup Information</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 mb-1">Shipping Channel</p>
                                    <p className="text-sm font-medium text-gray-800">{pickupInfo?.shippingChannel || "Standard Delivery"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 mb-1">Pickup Address</p>
                                    <div className="text-sm text-gray-700 leading-snug">
                                        {address?.address ? (
                                            <>
                                                <p className="font-medium">{address.address}</p>
                                                <p>{[address.city, address.state, address.district].filter(Boolean).join(", ")}</p>
                                                {address.zipcode && <p>{address.zipcode}</p>}
                                            </>
                                        ) : (
                                            <p className="text-gray-400">-</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-gray-400 mb-1">Date</p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {timeSlot?.date ? format(new Date(timeSlot.date * 1000), "dd/MM/yyyy") : <span className="text-gray-400 italic">Not available</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 mb-1">Time</p>
                                    <p className="text-sm font-medium text-gray-800">{timeSlot?.time_text || <span className="text-gray-400 italic">Not available</span>}</p>
                                </div>
                            </div>
                        </div>

                        {/* Logistic Information Timeline */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 bg-white border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900">Logistic Information</h3>
                            </div>
                            <div className="p-4">
                                {(shippingData.trackingTimeline && shippingData.trackingTimeline.length > 0) ? (
                                    <div className="space-y-0">
                                        {shippingData.trackingTimeline.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="flex flex-col items-center pt-1">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-[#40C9AF] shadow-[0_0_0_4px_rgba(64,201,175,0.1)]' : 'bg-gray-300'}`} />
                                                    {idx < shippingData.trackingTimeline.length - 1 && (
                                                        <div className="w-0.5 grow bg-gray-100 mt-1 min-h-[20px]" />
                                                    )}
                                                </div>
                                                <div className="pb-3">
                                                    <p className={`text-sm font-bold ${idx === 0 ? 'text-[#40C9AF]' : 'text-gray-500'}`}>
                                                        {item.description}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {item.update_time
                                                            ? new Date(item.update_time * 1000).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center pt-1">
                                            <div className="w-2.5 h-2.5 bg-[#40C9AF] rounded-full shadow-[0_0_0_4px_rgba(64,201,175,0.1)]" />
                                            <div className="w-0.5 grow bg-gray-100 mt-1" />
                                        </div>
                                        <div className="pb-2">
                                            <p className="text-sm font-bold text-[#40C9AF]">Sender is preparing to ship your parcel</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Action Bar - Print Waybill at bottom right */}
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={async () => {
                                    setLoading(true)
                                    setError("")
                                    try {
                                        const res = await fetch("/api/shopee/orders/waybill", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                orderSn: shippingData.orderSn,
                                                packageNumber: shippingData.packageNumber
                                            })
                                        })

                                        if (res.status === 202) {
                                            alert("Waybill is being generated. Please wait 5 seconds and try again.")
                                            return
                                        }

                                        if (!res.ok) {
                                            const data = await res.json()
                                            throw new Error(data.error || "Failed to generate waybill")
                                        }

                                        const blob = await res.blob()
                                        const url = window.URL.createObjectURL(blob)
                                        const a = document.createElement("a")
                                        a.href = url
                                        a.download = `waybill-${shippingData.orderSn}.pdf`
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                    } catch (err: any) {
                                        setError(err.message)
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                                disabled={loading || !shippingData.trackingNumber}
                                className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-10 py-2.5 rounded shadow-sm text-sm font-bold"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Print Waybill
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none rounded-2xl">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-gray-800">Arrange Shipment</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => setMethod("dropoff")}
                            className={cn(
                                "relative flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200",
                                method === "dropoff"
                                    ? "border-orange-500 bg-orange-50/30 ring-1 ring-orange-500"
                                    : "border-gray-100 hover:border-gray-200 bg-white"
                            )}
                        >
                            <div className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                                method === "dropoff" ? "bg-orange-100" : "bg-gray-100"
                            )}>
                                <MapPin className={cn("h-6 w-6", method === "dropoff" ? "text-orange-600" : "text-gray-500")} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-gray-900">I Will Arrange Drop-Off</p>
                                <p className="text-sm text-gray-500">You can drop off your parcel at any Shopee drop-off point.</p>
                            </div>
                            {method === "dropoff" && (
                                <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-orange-500 p-1">
                                    <Check className="h-full w-full text-white" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setMethod("pickup")}
                            className={cn(
                                "relative flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200",
                                method === "pickup"
                                    ? "border-orange-500 bg-orange-50/30 ring-1 ring-orange-500"
                                    : "border-gray-100 hover:border-gray-200 bg-white"
                            )}
                        >
                            <div className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                                method === "pickup" ? "bg-orange-100" : "bg-gray-100"
                            )}>
                                <Truck className={cn("h-6 w-6", method === "pickup" ? "text-orange-600" : "text-gray-500")} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-gray-900">I Will Arrange Pickup</p>
                                <p className="text-sm text-gray-500">The courier will come to your address to pick up the parcel.</p>
                            </div>
                            {method === "pickup" && (
                                <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-orange-500 p-1">
                                    <Check className="h-full w-full text-white" />
                                </div>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={handleShip}
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base shadow-lg shadow-orange-200 transition-all hover:translate-y-[-2px] active:translate-y-0"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Applying for tracking number...
                                </>
                            ) : (
                                "Confirm"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="w-full text-gray-500 font-bold hover:bg-gray-50"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
