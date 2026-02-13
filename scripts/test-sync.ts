import { syncOrders, syncProducts } from "../lib/shopee/sync-logic"

async function test() {
    console.log("--- Testing syncOrders ---")
    try {
        const result = await syncOrders()
        console.log("Result:", result)
    } catch (e) {
        console.error("Error:", e)
    }

    console.log("\n--- Testing syncProducts ---")
    try {
        const result = await syncProducts()
        console.log("Result:", result)
    } catch (e) {
        console.error("Error:", e)
    }
}

test().then(() => process.exit(0))
