#!/usr/bin/env node
// Hide `app/api` during Capacitor (static export) builds. Next.js `output:
// "export"` refuses to build dynamic Route Handlers, but the app doesn't
// need them — every fetch goes to NEXT_PUBLIC_API_BASE (a hosted web
// deployment). We stash the folder outside `app/` then restore it after.
//
// Uses copy + rm instead of rename to survive Windows file watchers
// (IDE/editor open in the folder tree) that would otherwise EPERM.
//
// Usage:
//   node scripts/app-build-guard.js hide    # before `next build`
//   node scripts/app-build-guard.js restore # after  `next build`

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIVE = path.join(ROOT, "app", "api");
const STASH = path.join(ROOT, ".app-api.stash");

function rimraf(p) {
  if (!fs.existsSync(p)) return;
  // Retry loop for Windows: file watchers sometimes hold handles briefly.
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 });
      return;
    } catch (err) {
      if (i === 4) throw err;
      // Small sleep via busy loop (no async in sync script).
      const until = Date.now() + 300;
      while (Date.now() < until) {}
    }
  }
}

function hide() {
  if (fs.existsSync(STASH)) {
    console.log("[app-build-guard] Stash already exists — skipping hide.");
    return;
  }
  if (!fs.existsSync(LIVE)) {
    console.log("[app-build-guard] app/api not found — nothing to hide.");
    return;
  }
  fs.cpSync(LIVE, STASH, { recursive: true });
  rimraf(LIVE);
  console.log("[app-build-guard] Copied app/api → .app-api.stash and removed original");
}

function restore() {
  if (!fs.existsSync(STASH)) return;
  if (fs.existsSync(LIVE)) {
    console.warn(
      "[app-build-guard] app/api reappeared alongside stash — merging by deleting live copy first.",
    );
    rimraf(LIVE);
  }
  fs.cpSync(STASH, LIVE, { recursive: true });
  rimraf(STASH);
  console.log("[app-build-guard] Restored .app-api.stash → app/api");
}

const action = process.argv[2];
if (action === "hide") hide();
else if (action === "restore") restore();
else {
  console.error("Usage: app-build-guard.js hide|restore");
  process.exit(1);
}
