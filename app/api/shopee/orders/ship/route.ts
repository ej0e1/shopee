import { NextResponse } from "next/server"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"
import { syncOrders } from "@/lib/shopee/sync-logic"

/**
 * Helper to call Shopee API with correct signature
 */
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
 * POST /api/shopee/orders/ship
 * 
 * Two-step process:
 * 1. get_shipping_parameter → discover what info is needed + available options
 * 2. ship_order → ship with the correct body
 * 
 * Body: { orderSn: string, pickup: boolean }
 * 
 * Shopee get_shipping_parameter response structure:
 * {
 *   response: {
 *     info_needed: {
 *       pickup: ["address_id", "pickup_time_id"],    // array of field names needed
 *       dropoff: ["branch_id", "sender_real_name"],  // array of field names needed
 *       non_integrated: ["tracking_number"]           // or this
 *     },
 *     pickup: {                                       // actual pickup data
 *       address_list: [{ address_id: 123, ... }],
 *       time_slot_list: [{ pickup_time_id: "xxx", date: ... }]
 *     },
 *     dropoff: {                                      // actual dropoff data
 *       branch_list: [{ branch_id: 123, ... }],
 *       sender_real_name: "..."
 *     }
 *   }
 * }
 */
export async function POST(req: Request) {
    try {
        const { orderSn, pickup } = await req.json()
        if (!orderSn) {
            return NextResponse.json({ error: "orderSn is required" }, { status: 400 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "No valid Shopee token" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken

        // ── Step 1: Get shipping parameters (Reactive approach) ──────
        // We try WITHOUT package_number first to satisfy "unsplit" orders.
        // If Shopee errors with "package_number required", we fetch and retry.
        console.log(`[Ship] Getting shipping params for order ${orderSn}...`)
        let packageNumber = ""
        let paramData = await callShopee(
            "/api/v2/logistics/get_shipping_parameter",
            { order_sn: orderSn },
            shopId, accessToken, "GET"
        )

        // Handle "Please request with package_number for this split order"
        const isSplitOrderError = paramData.error === "logistics.package_number_not_exist" || paramData.message?.includes("package_number")

        if (isSplitOrderError) {
            console.log("[Ship] Split order detected (Shopee requested package_number). Fetching...")
            const orderDetail = await callShopee(
                "/api/v2/order/get_order_detail",
                {
                    order_sn_list: orderSn,
                    response_optional_fields: "package_list"
                },
                shopId, accessToken, "GET"
            )

            const orderInfo = orderDetail.response?.order_list?.[0]
            if (orderInfo?.package_list?.length > 0) {
                packageNumber = orderInfo.package_list[0].package_number
                console.log("[Ship] Retrying get_shipping_parameter with package_number:", packageNumber)

                paramData = await callShopee(
                    "/api/v2/logistics/get_shipping_parameter",
                    {
                        order_sn: orderSn,
                        package_number: packageNumber
                    },
                    shopId, accessToken, "GET"
                )
            }
        }

        console.log("[Ship] final get_shipping_parameter response:", JSON.stringify(paramData, null, 2))

        // Handle specific state mismatch error or other failures
        if (paramData.error && paramData.error !== "") {
            const isStateMismatch = paramData.message?.includes("ready to be shipped") || paramData.error?.includes("ready to be shipped")

            if (isStateMismatch) {
                console.log("[Ship] State mismatch detected. Triggering sync for", orderSn)
                await syncOrders([orderSn])
                return NextResponse.json({
                    error: "Order state mismatch: Already processed on Shopee. We've updated your dashboard.",
                    isStateMismatch: true
                }, { status: 400 })
            }

            return NextResponse.json({
                error: `get_shipping_parameter failed: ${paramData.message || paramData.error}`,
                detail: paramData
            }, { status: 400 })
        }

        const shopeeResp = paramData.response || {}
        const infoNeeded = shopeeResp.info_needed || {}

        // ── Step 3: Build ship_order body ─────────────────────────────
        const shipBody: any = { order_sn: orderSn }
        if (packageNumber) {
            shipBody.package_number = packageNumber
        }

        if (pickup) {
            // ─── Pickup mode ──────────────────────────────────────────
            if (infoNeeded.pickup) {
                const pickupData = shopeeResp.pickup || {}
                const addressList = pickupData.address_list || []
                const firstAddress = addressList[0]

                if (!firstAddress) {
                    return NextResponse.json({
                        error: "No pickup address available. Check your Shopee pickup address settings.",
                        shopeeResponse: shopeeResp
                    }, { status: 400 })
                }

                const addressId = firstAddress.address_id
                const timeSlotList = firstAddress.time_slot_list || []

                // Pick the recommended slot first, then first future slot, then last available
                const nowSec = Math.floor(Date.now() / 1000)
                const recommendedSlot = timeSlotList.find((s: any) => s.flags?.includes("recommended"))
                const futureSlot = timeSlotList.find((s: any) => s.date >= nowSec)
                const validSlot = recommendedSlot || futureSlot || timeSlotList[timeSlotList.length - 1]
                const pickupTimeId = validSlot?.pickup_time_id

                shipBody.pickup = {
                    address_id: addressId,
                    ...(pickupTimeId ? { pickup_time_id: pickupTimeId } : {})
                }

                // Store for response
                shopeeResp.selected_address = firstAddress
                shopeeResp.selected_timeslot = validSlot
                console.log("[Ship] Using pickup mode:", shipBody.pickup)
            } else {
                return NextResponse.json({
                    error: "Pickup is not available for this order.",
                    shopeeResponse: shopeeResp
                }, { status: 400 })
            }
        } else {
            // ─── Drop-off mode ────────────────────────────────────────
            if (infoNeeded.dropoff) {
                const dropoffData = shopeeResp.dropoff || {}
                const branchList = dropoffData.branch_list || []
                const branchId = branchList[0]?.branch_id

                if (!branchId) {
                    return NextResponse.json({
                        error: "No drop-off branch available.",
                        dropoffData
                    }, { status: 400 })
                }

                shipBody.dropoff = {
                    branch_id: branchId,
                    sender_real_name: dropoffData.sender_real_name || ""
                }
                console.log("[Ship] Using dropoff mode:", shipBody.dropoff)
            } else if (infoNeeded.non_integrated) {
                shipBody.non_integrated = {}
                console.log("[Ship] Using non-integrated mode")
            } else {
                return NextResponse.json({
                    error: "Drop-off is not available for this order.",
                    shopeeResponse: shopeeResp
                }, { status: 400 })
            }
        }

        // ── Step 4: Call ship_order ────────────────────────────────────
        console.log("[Ship] Calling ship_order with body:", JSON.stringify(shipBody, null, 2))
        const shipData = await callShopee(
            "/api/v2/logistics/ship_order",
            shipBody,
            shopId, accessToken, "POST"
        )

        console.log("[Ship] ship_order response:", JSON.stringify(shipData, null, 2))

        if (shipData.error && shipData.error !== "") {
            return NextResponse.json({
                error: `Ship failed: ${shipData.message || shipData.error}`,
                detail: shipData
            }, { status: 400 })
        }

        // ── Step 5: Get tracking number (with Retry) ────────────────
        console.log("[Ship] Getting tracking number...")
        let trackingNumber = ""
        let attempts = 0
        const maxAttempts = 3

        while (attempts < maxAttempts && !trackingNumber) {
            if (attempts > 0) {
                console.log(`[Ship] Tracking number empty, retry attempt ${attempts}...`)
                await new Promise(r => setTimeout(r, 2000)) // Wait 2s between retries
            }

            const trackingData = await callShopee(
                "/api/v2/logistics/get_tracking_number",
                { order_sn: orderSn, package_number: packageNumber || undefined },
                shopId, accessToken, "GET"
            )

            trackingNumber = trackingData.response?.tracking_number || ""

            // Fallback: Check order details if get_tracking_number remains empty
            if (!trackingNumber) {
                console.log("[Ship] get_tracking_number empty, trying get_order_detail fallback...")
                const orderDetailFallback = await callShopee(
                    "/api/v2/order/get_order_detail",
                    {
                        order_sn_list: orderSn,
                        response_optional_fields: "tracking_number"
                    },
                    shopId, accessToken, "GET"
                )
                trackingNumber = orderDetailFallback.response?.order_list?.[0]?.tracking_number || ""
            }

            attempts++
        }

        console.log("[Ship] Final tracking_number:", trackingNumber)

        // ── Step 6: Sync after success ─────────────────────────────────
        await syncOrders([orderSn])

        // ── Step 7: Save pickup details for later retrieval ───────────
        const pickupDetails = pickup ? {
            address: shopeeResp.selected_address,
            timeSlot: shopeeResp.selected_timeslot,
            shippingChannel: shopeeResp.pickup?.shipping_channel || "Shopee Supported Logistics"
        } : null

        try {
            const existingOrder = await (await import("@/lib/prisma")).prisma.shopeeOrder.findUnique({
                where: { orderSn }
            })
            if (existingOrder) {
                const existingRaw = (existingOrder.raw as any) || {}
                await (await import("@/lib/prisma")).prisma.shopeeOrder.update({
                    where: { orderSn },
                    data: {
                        raw: {
                            ...existingRaw,
                            _pickupDetails: pickupDetails,
                            _trackingNumber: trackingNumber,
                            _packageNumber: packageNumber,
                            _shippingCarrier: shopeeResp.pickup?.shipping_channel || existingRaw.shipping_carrier || ""
                        }
                    }
                })
            }
        } catch (saveErr) {
            console.error("[Ship] Failed to save pickup details to DB:", saveErr)
        }

        return NextResponse.json({
            success: true,
            orderSn,
            trackingNumber,
            pickupInfo: pickupDetails,
            dropoffInfo: !pickup ? {
                branch: shopeeResp.dropoff?.branch_list?.find((b: any) => b.branch_id === shipBody.dropoff?.branch_id),
                senderRealName: shipBody.dropoff?.sender_real_name
            } : null,
            packageNumber
        })

    } catch (error: any) {
        console.error("[Ship Order] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
