/**
 * Next.js Middleware for API Route Protection
 * 
 * This middleware runs on the Edge runtime and protects all API routes
 * by validating the user's session before allowing requests through.
 * 
 * Features:
 * - Validates session for all /api/* routes (except /api/auth/*)
 * - Returns 401 Unauthorized for missing or expired sessions
 * - Runs on Edge runtime for optimal performance
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth-related endpoints to pass through
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check if this is an API route that needs protection
  if (pathname.startsWith("/api/")) {
    // Get the JWT token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no token or token is expired, return 401
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session" },
        { status: 401 }
      );
    }

    // Check if Strapi JWT has expired (read from JWT 'exp' claim)
    // The expiration is decoded from the Strapi JWT token itself
    if (token.azureTokenExpires && Date.now() >= token.azureTokenExpires) {
      return NextResponse.json(
        { error: "Unauthorized - Session expired" },
        { status: 401 }
      );
    }

    // Session is valid, allow request to proceed
    return NextResponse.next();
  }

  // For non-API routes, allow through
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all API routes except:
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     */
    "/api/:path*",
  ],
};
