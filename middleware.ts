import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Allow the Next.js API routes to be called from the Capacitor Android/iOS
// WebView (whose origin is `https://localhost` / `capacitor://localhost`)
// and from the same-origin web deployment.
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const isAllowed = origin
    ? ALLOWED_ORIGINS.has(origin) || origin.endsWith(".vercel.app")
    : false;
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-user-gemini-key, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const res = NextResponse.next();
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v as string));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
