import { NextResponse } from "next/server"
import { runAutomationTasks } from "@/lib/shopee/automation"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const result = await runAutomationTasks()
        if (result.success) {
            return NextResponse.json(result)
        } else {
            return NextResponse.json({ error: result.error || "Automation failed" }, { status: 500 })
        }
    } catch (error: any) {
        console.error("Automation Error:", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

