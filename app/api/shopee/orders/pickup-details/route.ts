import { NextRequest, NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"
import { prisma } from "@/lib/prisma"

async function callShopee(path: string, params: Record<string, any>, shopId: number, accessToken: string, method: "GET" | "POST" = "GET") {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = generateSignature(SHOPEE_PARTNER_KEY, [
        SHOPEE_PARTNER_ID, path, timestamp, accessToken, shopId
    ])

    const url = new URL(`${SHOPEE_HOST}${path}`)
    url.searchParams.set("partner_id", String(SHOPEE_PARTNER_ID))
    url.searchParams.set("timestamp", String(timestamp))
    url.searchParams.set("access_token", accessToken)
    url.searchParams.set("shop_id", String(shopId))
    url.searchParams.set("sign", sign)

    const options: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" }
    }

    if (method === "GET") {
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, String(params[key]))
        })
    } else {
        options.body = JSON.stringify(params)
    }

    const res = await fetch(url.toString(), options)
    return res.json()
}

/**
 * POST /api/shopee/orders/pickup-details
 * 
 * Fetches comprehensive pickup details for a processed order.
 * 
 * Strategy:
 * 1. Check database first (saved during ship_order)
 * 2. Call Shopee APIs as fallback
 * 
 * Body: { orderSn: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { orderSn } = await req.json()
        if (!orderSn) {
            return NextResponse.json({ error: "orderSn is required" }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "No valid Shopee token" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken

        // ── Step 1: Check database for saved pickup details ───────────
        const dbOrder = await prisma.shopeeOrder.findUnique({
            where: { orderSn }
        })

        const raw = (dbOrder?.raw as any) || {}
        const savedPickup = raw._pickupDetails
        const savedTrackingNumber = raw._trackingNumber || raw.tracking_number || ""
        const savedPackageNumber = raw._packageNumber || ""

        console.log("[PickupDetails] DB data for", orderSn, "- tracking:", savedTrackingNumber, "- hasPickupDetails:", !!savedPickup)

        // ── Step 2: Get fresh tracking number from Shopee if missing ──
        let trackingNumber = savedTrackingNumber
        let packageNumber = savedPackageNumber

        if (!trackingNumber) {
            console.log("[PickupDetails] Fetching tracking number from Shopee...")
            const orderDetail = await callShopee(
                "/api/v2/order/get_order_detail",
                {
                    order_sn_list: orderSn,
                    response_optional_fields: "tracking_number,package_list,shipping_carrier"
                },
                shopId, accessToken, "GET"
            )

            const order = orderDetail.response?.order_list?.[0]
            trackingNumber = order?.tracking_number || ""
            packageNumber = order?.package_list?.[0]?.package_number || packageNumber

            // Also try get_tracking_number API
            if (!trackingNumber) {
                try {
                    const tn = await callShopee(
                        "/api/v2/logistics/get_tracking_number",
                        {
                            order_sn: orderSn,
                            ...(packageNumber ? { package_number: packageNumber } : {})
                        },
                        shopId, accessToken, "GET"
                    )
                    trackingNumber = tn.response?.tracking_number || ""
                } catch (err) {
                    console.error("[PickupDetails] get_tracking_number failed:", err)
                }
            }
        }

        // ── Step 3: Get tracking timeline ─────────────────────────────
        let trackingTimeline: any[] = []
        try {
            const trackingInfoRes = await callShopee(
                "/api/v2/logistics/get_tracking_info",
                {
                    order_sn: orderSn,
                    ...(packageNumber ? { package_number: packageNumber } : {})
                },
                shopId, accessToken, "GET"
            )
            if (trackingInfoRes.response?.tracking_info) {
                trackingTimeline = trackingInfoRes.response.tracking_info
            }
        } catch (err) {
            console.error("[PickupDetails] get_tracking_info failed:", err)
        }

        // ── Step 4: Build pickup info ─────────────────────────────────
        // Extract shipping carrier from raw package_list (from sync data)
        const rawCarrier = raw.package_list?.[0]?.shipping_carrier || raw._shippingCarrier || ""
        let pickupInfo: any = null

        // ── Debug Logging ─────────────────────────────────────────────
        const debug = req.nextUrl.searchParams.get("debug") === "true"
        const debugLogs: any[] = []

        if (savedPickup) {

            // We have saved pickup details from when the order was shipped
            pickupInfo = savedPickup
            if (debug) debugLogs.push({ source: "db", savedPickup })
            console.log("[PickupDetails] Using saved pickup details from DB")
        } else {
            // Fallback 1: try get_shipping_parameter (only works for READY_TO_SHIP)
            console.log("[PickupDetails] No saved pickup, attempting get_shipping_parameter...")
            try {
                let paramResponse = await callShopee(
                    "/api/v2/logistics/get_shipping_parameter",
                    { order_sn: orderSn },
                    shopId, accessToken, "GET"
                )

                if (debug) debugLogs.push({ source: "get_shipping_parameter", response: paramResponse })

                // Handle split order
                if (paramResponse.error === "logistics.package_number_not_exist" && packageNumber) {
                    paramResponse = await callShopee(
                        "/api/v2/logistics/get_shipping_parameter",
                        { order_sn: orderSn, package_number: packageNumber },
                        shopId, accessToken, "GET"
                    )
                    if (debug) debugLogs.push({ source: "get_shipping_parameter_retry", response: paramResponse })
                }

                const pickupData = paramResponse.response?.pickup
                if (pickupData?.address_list?.length > 0) {
                    const addr = pickupData.address_list[0]
                    const timeSlotList = addr.time_slot_list || []
                    const nowSec = Math.floor(Date.now() / 1000)
                    const timeSlot = timeSlotList.find((s: any) => s.flags?.includes("recommended"))
                        || timeSlotList.find((s: any) => s.date >= nowSec)
                        || timeSlotList[0] || null

                    pickupInfo = {
                        address: addr,
                        timeSlot,
                        shippingChannel: rawCarrier || "Shopee Logistics"
                    }
                }
            } catch (err: any) {
                if (debug) debugLogs.push({ source: "get_shipping_parameter_error", error: err.message || err })
                console.error("[PickupDetails] get_shipping_parameter failed (expected for processed orders):", err)
            }

            // Fallback 2: Use get_address_list to get the shop's pickup address
            if (!pickupInfo) {
                console.log("[PickupDetails] Trying get_address_list fallback...")
                try {
                    const addressListRes = await callShopee(
                        "/api/v2/logistics/get_address_list",
                        {},
                        shopId, accessToken, "GET"
                    )

                    if (debug) debugLogs.push({ source: "get_address_list", response: addressListRes })

                    const addressList = addressListRes.response?.address_list || []
                    // Find the pickup address (address_type contains "PICKUP")
                    const pickupAddr = addressList.find((a: any) =>
                        a.address_type_list?.includes("PICKUP_ADDRESS")
                    ) || addressList.find((a: any) =>
                        a.address_flag?.includes("pickup_address")
                    ) || addressList[0]

                    if (pickupAddr) {
                        pickupInfo = {
                            address: pickupAddr,
                            timeSlot: null,
                            shippingChannel: rawCarrier || "Shopee Logistics"
                        }
                    }
                } catch (err: any) {
                    if (debug) debugLogs.push({ source: "get_address_list_error", error: err.message || err })
                    console.error("[PickupDetails] get_address_list failed:", err)
                }
            }

            // Final fallback: empty info
            if (!pickupInfo) {
                pickupInfo = {
                    address: null,
                    timeSlot: null,
                    shippingChannel: rawCarrier || "Shopee Logistics"
                }
            }
        }


        // ── Step 5: Self-healing - Update DB if we found new info ────────────────
        if (dbOrder) {
            const hasNewTracking = !savedTrackingNumber && trackingNumber
            const hasNewPickup = !savedPickup && pickupInfo
            const isReadyToShip = dbOrder.status === "READY_TO_SHIP"

            if (hasNewTracking || hasNewPickup || (isReadyToShip && trackingNumber)) {
                // Determine new status
                const newStatus = (isReadyToShip && trackingNumber) ? "PROCESSED" : dbOrder.status

                console.log(`[PickupDetails] Self-healing for ${orderSn}: Status -> ${newStatus}, Tracking -> ${trackingNumber}`)

                await prisma.shopeeOrder.update({
                    where: { orderSn },
                    data: {
                        status: newStatus,
                        raw: {
                            ...raw,
                            ...(trackingNumber ? { _trackingNumber: trackingNumber } : {}),
                            ...(packageNumber ? { _packageNumber: packageNumber } : {}),
                            ...(pickupInfo ? { _pickupDetails: pickupInfo } : {}),
                            ...(pickupInfo?.shippingChannel ? { _shippingCarrier: pickupInfo.shippingChannel } : {})
                        }
                    }
                })
            }
        }

        return NextResponse.json({
            success: true,
            orderSn,
            trackingNumber,
            shippingChannel: pickupInfo?.shippingChannel || raw.shipping_carrier || "Shopee Logistics",
            packageNumber,
            pickupInfo,
            trackingTimeline,
            ...(debug ? { debugLogs } : {})
        })
    } catch (err: any) {

        console.error("[PickupDetails] Error:", err)
        return NextResponse.json({ error: err.message || "Failed to fetch pickup details" }, { status: 500 })
    }
}
