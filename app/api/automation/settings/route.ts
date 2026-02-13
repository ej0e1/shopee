import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const settings = await prisma.automationSetting.findMany()
        const settingsMap = settings.reduce((acc: Record<string, boolean>, s) => ({ ...acc, [s.id]: s.enabled }), {})
        return NextResponse.json(settingsMap)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { id, enabled } = await req.json()
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

        const setting = await prisma.automationSetting.upsert({
            where: { id },
            update: { enabled },
            create: { id, enabled },
        })

        return NextResponse.json(setting)
    } catch (error) {
        return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
    }
}
