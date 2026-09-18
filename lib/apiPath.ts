// Resolves an API path so the same code works in both web and Capacitor
// (native app) builds.
//
// - Web build: `NEXT_PUBLIC_API_BASE` is empty → relative "/api/..." hits
//   the co-hosted Next.js Route Handlers.
// - App build (Capacitor): set `NEXT_PUBLIC_API_BASE=https://<host>` at
//   build time so fetches go to the hosted web deployment instead of the
//   in-app WebView origin (which has no server).

// Strip trailing slash so `https://host/` + `/api/x` becomes `https://host/api/x`,
// not `https://host//api/x`.
const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

export function apiPath(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${BASE}${path}`;
}
