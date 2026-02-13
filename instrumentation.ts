export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startAutomationService } = await import('@/lib/shopee/automation-service')
        startAutomationService()
    }
}
