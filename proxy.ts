import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log("[v0] Middleware hit:", pathname)

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next()
  }

  const session = request.cookies.get("session")?.value
  const isLoggedIn = session === "authenticated"

  console.log("[v0] Session cookie:", session, "isLoggedIn:", isLoggedIn)

  // Already logged in trying to visit /login -> redirect to dashboard
  if (pathname === "/login" && isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Not logged in trying to visit protected page -> redirect to login
  if (pathname !== "/login" && !isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
