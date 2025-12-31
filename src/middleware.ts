import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/editor"]; // Removed /dashboard for development
const publicRoutes = ["/", "/dashboard", "/api/waitlist"]; // Added /dashboard as public route
const authRoutes = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/demo"];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Check for demo mode - redirect to demo login which will set cookie and redirect back
  if (searchParams.get("demo") === "true") {
    const redirectUrl = new URL("/api/auth/demo", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow all auth routes
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for session cookie
    const sessionCookie = request.cookies.get("aeropod_session");

    if (!sessionCookie) {
      // Redirect to home page if not authenticated
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      // Parse and validate session
      const sessionData = JSON.parse(sessionCookie.value);

      // Check if session is expired
      if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
        const response = NextResponse.redirect(new URL("/", request.url));
        response.cookies.delete("aeropod_session");
        return response;
      }
    } catch (error) {
      // Invalid session cookie, redirect to home
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("aeropod_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
