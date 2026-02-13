import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const profile = await (prisma as any).userProfile.findUnique({
            where: { id: "default_user" }
        })

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error("Profile GET Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, role } = await req.json()

        const profile = await (prisma as any).userProfile.upsert({
            where: { id: "default_user" },
            update: { name, role },
            create: { id: "default_user", name: name || "Shopee Seller", role: role || "Seller Pro" }
        })

        return NextResponse.json(profile)
    } catch (error) {
        console.error("Profile POST Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
