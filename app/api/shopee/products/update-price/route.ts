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
        const { id, price, modelId } = await req.json()

        if (!id || price === undefined) {
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

        let priceList = []
        if (hasModel) {
            console.log(`Product ${product.shopeeItemId} has models, fetching model list...`)
            const modelPath = "/api/v2/product/get_model_list"
            const modelData = await fetchShopee(modelPath, {
                item_id: Number(product.shopeeItemId)
            }, shopId, accessToken, "GET")

            const models = modelData.response?.model || []
            if (models.length > 0) {
                // To avoid price range validation errors in Shopee (max 10x ratio),
                // we should always send the full list with all models' latest prices.
                priceList = models.map((m: any) => {
                    const isTarget = modelId && Number(m.model_id) === Number(modelId)
                    return {
                        model_id: m.model_id,
                        original_price: isTarget ? Number(price) : (m.price_info?.[0]?.original_price || 0)
                    }
                })

                if (modelId && !priceList.find((p: any) => p.model_id === Number(modelId))) {
                    console.warn(`Requested modelId ${modelId} not found in Shopee model list`)
                }
            } else {
                priceList = [{ model_id: 0, original_price: Number(price) }]
            }
        } else {
            priceList = [{ model_id: 0, original_price: Number(price) }]
        }

        // Shopee API: v2.product.update_price
        const shopeeRes = await fetchShopee("/api/v2/product/update_price", {
            item_id: Number(product.shopeeItemId),
            price_list: priceList
        }, shopId, accessToken)

        console.log("[Shopee Price Update] Response:", JSON.stringify(shopeeRes, null, 2))

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
        // If it's a model update, we need to update the JSON variants field too
        let updateData: any = { price }
        if (hasModel && Array.isArray(product.variants)) {
            const currentVariants = product.variants as any[]
            const newVariants = currentVariants.map(v => {
                if (modelId) {
                    if (v.modelId === Number(modelId)) return { ...v, price: Number(price) }
                    return v
                }
                // If no modelId, update all (legacy support)
                return { ...v, price: Number(price) }
            })
            updateData.variants = newVariants
            // Update display price to the first model's price
            updateData.price = newVariants[0]?.price || price
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(updatedProduct)

    } catch (error: any) {
        console.error("[Shopee Price Update Error]", error)
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 })
    }
}
