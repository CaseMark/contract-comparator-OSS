/**
 * Next.js Middleware
 *
 * No authentication required - all routes are public.
 * Browser isolation is maintained via localStorage/IndexedDB.
 */

import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
