import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.parkyoonha.opendomain",
  appName: "opendomain",
  // Next.js static export lands in `.next-app/` when built with
  // BUILD_TARGET=app (distDir override in next.config.js keeps dev's `.next`
  // separate so `next dev` and `next build` don't clobber each other).
  webDir: ".next-app",
  // Optional: allow WebView to load resources from the hosted API host.
  // Set NEXT_PUBLIC_API_BASE in .env.local (or shell env) to a full URL like
  // https://opendomain.vercel.app before running `npm run app:build`.
  server: {
    androidScheme: "https",
  },
};

export default config;
