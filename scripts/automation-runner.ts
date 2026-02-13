/**
 * Shopee Automation Runner
 * This script hits the auto-bump API every 60 seconds.
 * Suitable for Sandbox environments.
 */

const API_URL = "http://localhost:3000/api/shopee/automation/run"
const INTERVAL_MS = 10000 // 10 seconds for faster response

async function runAutomation() {
    console.log(`[${new Date().toLocaleTimeString()}] Triggering automation...`)
    try {
        const res = await fetch(API_URL)
        const data = await res.json()
        if (data.success) {
            const bumpedCount = data.bump?.count || 0
            console.log(`[Success] Bumped ${bumpedCount} products.`)
        } else {
            console.log(`[Status] ${data.message || JSON.stringify(data)}`)
        }
    } catch (error: any) {
        console.error(`[Error] Failed to hit automation API: ${error.message}`)
    }
}

console.log("Starting Shopee Automation Runner...")
console.log(`Target: ${API_URL}`)
console.log(`Interval: ${INTERVAL_MS / 1000}s`)

// Run once immediately
runAutomation()

// Schedule
setInterval(runAutomation, INTERVAL_MS)
