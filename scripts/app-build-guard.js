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
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const LIVE = path.join(ROOT, "app", "api");
const STASH = path.join(ROOT, ".app-api.stash");

// If `next dev` is running, its file watcher will react to us moving
// `app/api` out and back, kick off a rebuild, and race with `next build`.
// The build then hangs indefinitely on Windows. Fail fast with a clear
// message instead of leaving the user to debug an invisible hang.
function assertNoDev() {
  if (process.platform !== "win32") return;
  let out = "";
  try {
    out = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*next*dev*\' -or $_.CommandLine -like \'*start-server*\' } | Select-Object -ExpandProperty ProcessId"',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return;
  }
  const pids = out.split(/\s+/).filter(Boolean);
  if (pids.length === 0) return;
  console.error(
    `\n[app-build-guard] ✖ next dev is running (pid: ${pids.join(", ")}).\n` +
      `  dev + build cannot run concurrently — dev's file watcher races with the static export.\n` +
      `  Stop dev first (Ctrl+C in that terminal, or  kill  the pids above), then re-run.\n`,
  );
  process.exit(1);
}

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
  assertNoDev();
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
