/** @type {import('next').NextConfig} */
// Two build modes:
// - Web (default): normal Next.js build with server-side API routes.
//   Deploy to Vercel or any Node host. `npm run build`.
// - App (Capacitor): static export into `out/`, API routes are disabled at
//   runtime and every fetch must go to NEXT_PUBLIC_API_BASE (a hosted web
//   deployment). `BUILD_TARGET=app npm run build` — or `npm run app:build`.
const isApp = process.env.BUILD_TARGET === "app";

const nextConfig = {
  reactStrictMode: true,
  // App build writes into a separate distDir so a running `next dev` (which
  // holds file locks on `.next/trace` on Windows) never conflicts with
  // `npm run app:sync`.
  ...(isApp
    ? {
        distDir: ".next-app",
        output: "export",
        images: { unoptimized: true },
        // Capacitor loads files via file:// or capacitor://; disable trailing
        // slash for cleaner asset paths inside the WebView.
        trailingSlash: false,
      }
    : {}),
};

module.exports = nextConfig;
