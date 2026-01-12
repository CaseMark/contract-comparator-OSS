/**
 * Next.js Middleware for Route Protection
 *
 * Protects routes by checking for authentication before allowing access.
 * Supports both Better Auth (cookie-based) and local IndexedDB auth.
 *
 * @see skills/auth/SKILL.md for detailed documentation
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie name used by local IndexedDB auth to signal active session
 * This is set client-side when a user logs in/out with local auth
 */
const LOCAL_AUTH_COOKIE = "ccc:local-session";

/**
 * Routes that don't require authentication
 * Add public routes here (marketing pages, login, signup, etc.)
 */
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/api/auth", // Better Auth API routes
];

/**
 * Check if a path matches any of the public routes
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  // Better Auth uses "better-auth.session_token" by default
  // Local auth uses "ccc:local-session" cookie
  const betterAuthSession = request.cookies.get("better-auth.session_token");
  const localAuthSession = request.cookies.get(LOCAL_AUTH_COOKIE);

  if (!betterAuthSession && !localAuthSession) {
    // Redirect to login with callback URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware runs on
 *
 * This pattern excludes:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico
 * - public files (svg, png, jpg, etc.)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
