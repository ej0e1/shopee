import { prisma } from "@/lib/prisma"
import { getValidToken } from "./token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "./config"
import { generateSignature } from "./signature"

/**
 * Helper to fetch data from Shopee
 */
async function fetchShopee(path: string, params: any, shopId: number, accessToken: string, method: "GET" | "POST" = "POST") {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = generateSignature(SHOPEE_PARTNER_KEY, [
        SHOPEE_PARTNER_ID,
        path,
        timestamp,
        accessToken,
        shopId
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
            url.searchParams.append(key, String(params[key]))
        })
    } else {
        options.body = JSON.stringify(params)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
        const res = await fetch(url.toString(), {
            ...options,
            signal: controller.signal
        })
        clearTimeout(timeoutId)
        return res.json()
    } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
            console.error(`[Shopee API] Timeout fetching ${path}`)
            return { error: "timeout", message: "Request timed out" }
        }
        throw err
    }
}

/**
 * SHOPEE PRODUCT SYNC
 */
export async function syncProducts() {
    console.log("[Sync] Starting comprehensive product sync...")
    const token = await getValidToken()
    if (!token) throw new Error("No valid Shopee token")

    const shopId = Number(token.shopId)
    const accessToken = token.accessToken

    const itemListPath = "/api/v2/product/get_item_list"
    let allItems: any[] = []
    const statuses = ["NORMAL", "UNLIST", "BANNED", "DELETED"]

    for (const status of statuses) {
        const listData = await fetchShopee(itemListPath, {
            offset: 0,
            page_size: 100,
            item_status: status
        }, shopId, accessToken, "GET")

        if (!listData.error && listData.response?.item) {
            allItems = [...allItems, ...listData.response.item]
        }
    }

    if (allItems.length === 0) return { count: 0, deleted: 0 }

    const itemIds = allItems.map((i: any) => i.item_id)
    const itemInfoPath = "/api/v2/product/get_item_base_info"

    // Shopee limits: 50 items per call. We'll chunk if necessary.
    const chunks = []
    for (let i = 0; i < itemIds.length; i += 50) {
        chunks.push(itemIds.slice(i, i + 50))
    }

    let savedCount = 0
    let shopeeItemIds: string[] = []

    for (const chunk of chunks) {
        const infoData = await fetchShopee(itemInfoPath, {
            item_id_list: chunk.join(",")
        }, shopId, accessToken, "GET")

        if (infoData.error) continue

        const productDetails = infoData.response?.item_list || []
        for (const p of productDetails) {
            let variants: any[] = []
            let totalStock = 0
            let displayPrice = 0

            if (p.has_model) {
                const modelPath = "/api/v2/product/get_model_list"
                const modelData = await fetchShopee(modelPath, { item_id: p.item_id }, shopId, accessToken, "GET")

                if (!modelData.error && modelData.response?.model) {
                    variants = modelData.response.model.map((m: any) => ({
                        modelId: m.model_id,
                        name: m.model_name,
                        sku: m.model_sku,
                        price: m.price_info?.[0]?.original_price || m.price_info?.[0]?.current_price || 0,
                        stock: m.stock_info_v2?.summary_info?.total_available_stock || m.stock_info?.[0]?.current_stock || 0
                    }))
                    totalStock = variants.reduce((acc, v) => acc + v.stock, 0)
                    displayPrice = variants[0]?.price || 0
                }
            } else {
                totalStock = p.stock_info_v2?.summary_info?.total_available_stock || p.stock_info?.[0]?.current_stock || 0
                displayPrice = p.price_info?.[0]?.original_price || p.price_info?.[0]?.current_price || 0
            }

            await prisma.product.upsert({
                where: { shopeeItemId: String(p.item_id) },
                update: {
                    name: p.item_name,
                    sku: p.item_sku,
                    stock: totalStock,
                    price: displayPrice,
                    status: p.item_status,
                    shopId: String(shopId),
                    variants: variants.length > 0 ? (variants as any) : undefined
                },
                create: {
                    shopeeItemId: String(p.item_id),
                    name: p.item_name,
                    sku: p.item_sku,
                    stock: totalStock,
                    price: displayPrice,
                    status: p.item_status,
                    shopId: String(shopId),
                    isAutoBump: false,
                    variants: variants.length > 0 ? (variants as any) : undefined
                }
            })
            shopeeItemIds.push(String(p.item_id))
            savedCount++
        }
    }

    // Deletion Cleanup
    const deletedResult = await prisma.product.deleteMany({
        where: {
            shopId: String(shopId),
            shopeeItemId: { notIn: shopeeItemIds }
        }
    })

    return { count: savedCount, deleted: deletedResult.count }
}

/**
 * SHOPEE ORDER SYNC
 */
export async function syncOrders(manualOrderSnList?: string[]) {
    console.log("[Sync] Starting order sync...")
    const token = await getValidToken()
    if (!token) throw new Error("No valid Shopee token")

    const shopId = Number(token.shopId)
    const accessToken = token.accessToken

    let orderSnList = manualOrderSnList || []

    if (orderSnList.length === 0) {
        const now = Math.floor(Date.now() / 1000)
        const sevenDaysAgo = now - (7 * 24 * 60 * 60)

        const listPath = "/api/v2/order/get_order_list"
        const listResponse = await fetchShopee(listPath, {
            time_range_field: "create_time",
            time_from: sevenDaysAgo,
            time_to: now,
            page_size: 50
        }, shopId, accessToken, "GET")

        if (listResponse.error || !listResponse.response?.order_list) {
            throw new Error(listResponse.message || "Failed to fetch order list")
        }

        orderSnList = listResponse.response.order_list.map((o: any) => o.order_sn)
    }

    if (orderSnList.length === 0) return { count: 0 }

    const detailPath = "/api/v2/order/get_order_detail"
    const detailResponse = await fetchShopee(detailPath, {
        order_sn_list: orderSnList,
        response_optional_fields: "buyer_user_id,buyer_username,total_amount,item_list,order_status,create_time,tracking_number,package_list"
    }, shopId, accessToken, "GET")

    if (detailResponse.error || !detailResponse.response?.order_list) {
        throw new Error(detailResponse.message || "Failed to fetch order details")
    }

    const existingOrders = await prisma.shopeeOrder.findMany({
        where: { orderSn: { in: orderSnList } },
        select: { orderSn: true, raw: true }
    })
    const existingMap = new Map((existingOrders as any[]).map(o => [o.orderSn, o.raw]))

    let syncedCount = 0
    const syncedOrders: any[] = []

    for (const order of detailResponse.response.order_list) {
        const buyerName = order.buyer_username || order.buyer_user_id?.toString() || "Unknown"
        const productNames = order.item_list?.map((i: any) => i.item_name).join(", ") || "No items"
        const totalAmount = order.total_amount || 0

        // Merge raw data, preserving keys starting with "_"
        const existingRaw = (existingMap.get(order.order_sn) || {}) as any
        const preservedRaw: any = {}
        if (existingRaw) {
            Object.keys(existingRaw).forEach(k => {
                if (k.startsWith("_")) {
                    preservedRaw[k] = existingRaw[k]
                }
            })
        }
        const mergedRaw = { ...order, ...preservedRaw }

        // Determine status: If READY_TO_SHIP but has saved tracking number, mark as PROCESSED
        let status = order.order_status
        if (status === "READY_TO_SHIP" && mergedRaw._trackingNumber) {
            console.log(`[Sync] Overriding status for ${order.order_sn}: READY_TO_SHIP -> PROCESSED (Tracking: ${mergedRaw._trackingNumber})`)
            status = "PROCESSED"
        } else {
            console.log(`[Sync] Status for ${order.order_sn}: ${status} (Tracking: ${mergedRaw._trackingNumber})`)
        }

        const savedOrder = await prisma.shopeeOrder.upsert({
            where: { orderSn: order.order_sn },
            update: {
                buyerName,
                productNames,
                totalAmount,
                status,
                createTime: new Date(order.create_time * 1000),
                raw: mergedRaw
            },
            create: {
                shopId,
                orderSn: order.order_sn,
                buyerName,
                productNames,
                totalAmount,
                status,
                createTime: new Date(order.create_time * 1000),
                raw: mergedRaw
            }
        })
        syncedOrders.push(savedOrder)
        syncedCount++
    }

    return { count: syncedCount, orders: syncedOrders }
}

/**
 * SHOPEE WALLET SYNC
 */
export async function syncWallet() {
    console.log("[Sync] Starting wallet sync...")
    const token = await getValidToken()
    if (!token) throw new Error("No valid Shopee token")

    const shopId = Number(token.shopId)
    const accessToken = token.accessToken

    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60)

    // Using get_escrow_list to see payouts/ready to release funds
    const escrowPath = "/api/v2/payment/get_escrow_list"
    const escrowData = await fetchShopee(escrowPath, {
        release_time_from: thirtyDaysAgo,
        release_time_to: now,
        page_size: 40
    }, shopId, accessToken, "POST")

    if (escrowData.error) {
        console.error("[Wallet Sync Error]", escrowData.message)
        return { count: 0 }
    }

    const escrowList = escrowData.response?.escrow_list || []
    let syncedCount = 0
    let totalIncome = 0

    if (escrowList.length > 0) {
        for (const item of escrowList) {
            await (prisma as any).walletTransaction.upsert({
                where: { referenceId: item.order_sn },
                update: {
                    amount: item.payout_amount || 0,
                    date: item.escrow_release_time ? new Date(item.escrow_release_time * 1000) : new Date(),
                    status: "Completed",
                    type: "Release",
                    source: "Shopee"
                },
                create: {
                    referenceId: item.order_sn,
                    amount: item.payout_amount || 0,
                    date: item.escrow_release_time ? new Date(item.escrow_release_time * 1000) : new Date(),
                    status: "Completed",
                    type: "Release",
                    source: "Shopee"
                }
            })
            totalIncome += (item.payout_amount || 0)
            syncedCount++
        }
    } else {
        // Simulation fallback for Sandbox: create transactions from COMPLETED/TO_CONFIRM_RECEIVE orders
        console.log("[Sync] No escrow found, simulating from orders...")
        const completedOrders = await (prisma as any).shopeeOrder.findMany({
            where: { status: { in: ["COMPLETED", "TO_CONFIRM_RECEIVE"] } }
        })
        for (const order of completedOrders) {
            await (prisma as any).walletTransaction.upsert({
                where: { referenceId: order.orderSn },
                update: {
                    amount: order.totalAmount,
                    date: order.createTime,
                    status: "Completed",
                    type: "Release",
                    source: "Shopee"
                },
                create: {
                    referenceId: order.orderSn,
                    amount: order.totalAmount,
                    date: order.createTime,
                    status: "Completed",
                    type: "Release",
                    source: "Shopee"
                }
            })
            totalIncome += order.totalAmount
            syncedCount++
        }
    }

    // Update User Profile Total Earned (Simulation)
    const allTransactions = await (prisma as any).walletTransaction.findMany({
        where: { status: "Completed" },
        select: { amount: true }
    })
    const totalEarned = allTransactions.reduce((acc: number, t: any) => acc + t.amount, 0)

    await (prisma as any).userProfile.update({
        where: { id: "default_user" },
        data: { totalEarned }
    })

    return { count: syncedCount, totalEarned }
}

/**
 * SHOPEE SHOP INFO SYNC (Updates Name)
 */
export async function syncShopInfo() {
    console.log("[Sync] Starting shop info sync...")
    const token = await getValidToken()
    if (!token) throw new Error("No valid Shopee token")

    const shopId = Number(token.shopId)
    const accessToken = token.accessToken

    const path = "/api/v2/shop/get_shop_info"
    const data = await fetchShopee(path, {}, shopId, accessToken, "GET")

    if (data.error) {
        console.error("[Shop Sync Error]", data.message)
        return null
    }

    const shopName = data.shop_name || "Shopee Seller"
    console.log("[Sync] Shop name found:", shopName)

    return { shopName }
}
