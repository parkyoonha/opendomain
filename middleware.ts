import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api/");

  // CORS preflight for /api/*.
  if (isApi && req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Refresh Supabase auth session cookie on every request (browser + API).
  // Follows the official @supabase/ssr middleware pattern.
  let response = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: req });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: req });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });
    // Touch getUser so expired access tokens are refreshed automatically.
    await supabase.auth.getUser();
  }

  if (isApi) {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) =>
      response.headers.set(k, v as string),
    );
  }

  return response;
}

export const config = {
  // Skip Next.js internals + static assets. Everything else — pages, API,
  // auth callback — runs through the middleware for CORS + session refresh.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
