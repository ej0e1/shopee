import { runAutomationTasks } from './automation'

// Prevent multiple intervals in development with global variable
declare global {
    var automationInterval: NodeJS.Timeout | undefined
}

export function startAutomationService() {
    if (global.automationInterval) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Automation] Service already running (dev mode skip)')
        }
        return
    }

    console.log('[Automation] Starting background service...')

    // Initial run
    runAutomationTasks().then(res => {
        if (res.success) {
            const count = res.bump?.count || 0
            if (count > 0) console.log(`[Automation] Bumped ${count} products`)
        }
    }).catch(err => console.error('[Automation] Startup check failed', err))

    // Schedule every 10 seconds
    global.automationInterval = setInterval(async () => {
        try {
            const res = await runAutomationTasks()
            if (res && res.success) {
                const count = res.bump?.count || 0
                if (count > 0) console.log(`[Automation] Bumped ${count} products`)
            }
        } catch (err) {
            console.error('[Automation] Background task failed:', err)
        }
    }, 10000)
}
