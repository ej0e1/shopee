import { NextResponse } from "next/server"

const DEMO_EMAIL = "admin@example.com"
const DEMO_PASSWORD = "123456"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set("session", "authenticated", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    })

    console.log("[v0] Login success, cookie set")
    return response
  } catch (err) {
    console.log("[v0] Login error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
