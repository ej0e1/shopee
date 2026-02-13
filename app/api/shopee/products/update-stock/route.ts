import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getValidToken } from "@/lib/shopee/token-database"
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, SHOPEE_HOST } from "@/lib/shopee/config"
import { generateSignature } from "@/lib/shopee/signature"

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

    const res = await fetch(url.toString(), options)
    return res.json()
}

export async function POST(req: Request) {
    try {
        const { id, stock, modelId } = await req.json()

        if (!id || stock === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        const token = await getValidToken()
        if (!token) {
            return NextResponse.json({ error: "Shopee not connected" }, { status: 401 })
        }

        const shopId = Number(token.shopId)
        const accessToken = token.accessToken

        // Check if product has models
        const itemInfoPath = "/api/v2/product/get_item_base_info"
        const infoData = await fetchShopee(itemInfoPath, {
            item_id_list: product.shopeeItemId
        }, shopId, accessToken, "GET")

        const itemBase = infoData.response?.item_list?.[0]
        const hasModel = itemBase?.has_model

        let models: any[] = []
        let stockList = []
        if (hasModel) {
            console.log(`Product ${product.shopeeItemId} has models, fetching model list...`)
            const modelPath = "/api/v2/product/get_model_list"
            const modelData = await fetchShopee(modelPath, {
                item_id: Number(product.shopeeItemId)
            }, shopId, accessToken, "GET")

            models = modelData.response?.model || []
            if (models.length > 0) {
                if (modelId) {
                    // Update only requested model
                    const targetModel = models.find((m: any) => m.model_id === Number(modelId))
                    const locationId = targetModel?.stock_info_v2?.seller_stock?.[0]?.location_id || ""

                    stockList = [{
                        model_id: Number(modelId),
                        seller_stock: [{
                            location_id: locationId,
                            stock: Number(stock)
                        }]
                    }]
                } else {
                    // Fallback: update the first model
                    const locationId = models[0].stock_info_v2?.seller_stock?.[0]?.location_id || ""
                    stockList = [{
                        model_id: models[0].model_id,
                        seller_stock: [{
                            location_id: locationId,
                            stock: Number(stock)
                        }]
                    }]
                }
            } else {
                stockList = [{ model_id: 0, seller_stock: [{ location_id: "", stock: Number(stock) }] }]
            }
        } else {
            stockList = [{ model_id: 0, seller_stock: [{ location_id: "", stock: Number(stock) }] }]
        }

        // Shopee API: v2.product.update_stock
        const shopeeRes = await fetchShopee("/api/v2/product/update_stock", {
            item_id: Number(product.shopeeItemId),
            stock_list: stockList
        }, shopId, accessToken)

        console.log("[Shopee Stock Update] Response:", JSON.stringify(shopeeRes, null, 2))

        if (shopeeRes.error) {
            const failureDetail = shopeeRes.response?.failure_list?.[0]
            let errorMessage = shopeeRes.message || "Shopee API error"

            if (failureDetail) {
                errorMessage = `${failureDetail.fail_error || errorMessage} (Model: ${failureDetail.model_id})`
            }

            return NextResponse.json({
                error: errorMessage,
                details: shopeeRes.error,
                shopeeResponse: shopeeRes
            }, { status: 400 })
        }

        // Update local DB
        let updateData: any = { stock: Number(stock) }
        if (hasModel && Array.isArray(product.variants)) {
            const currentVariants = product.variants as any[]
            const newVariants = currentVariants.map(v => {
                if (modelId) {
                    if (v.modelId === Number(modelId)) return { ...v, stock: Number(stock) }
                    return v
                }
                // If no modelId, update the first one (fallback)
                if (v.modelId == (models[0]?.model_id)) return { ...v, stock: Number(stock) }
                return v
            })
            updateData.variants = newVariants
            // Re-calculate total stock
            updateData.stock = newVariants.reduce((acc, v) => acc + (v.stock || 0), 0)
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(updatedProduct)

    } catch (error: any) {
        console.error("[Shopee Stock Update Error]", error)
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 })
    }
}
