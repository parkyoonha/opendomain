#!/usr/bin/env node
// Hide `app/api` and `app/auth` during Capacitor (static export) builds.
// Next.js `output: "export"` refuses to build dynamic Route Handlers, but
// the app doesn't need them — every fetch goes to NEXT_PUBLIC_API_BASE
// (a hosted web deployment), and OAuth callbacks happen on the web too
// (Capacitor deep-link handling is a separate future concern). We stash
// those folders outside `app/` then restore them after the build.
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
const TARGETS = [
  { live: path.join(ROOT, "app", "api"), stash: path.join(ROOT, ".app-api.stash") },
  { live: path.join(ROOT, "app", "auth"), stash: path.join(ROOT, ".app-auth.stash") },
];

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

function relLabel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function hideOne({ live, stash }) {
  if (fs.existsSync(stash)) {
    console.log(`[app-build-guard] ${relLabel(stash)} already exists — skipping hide.`);
    return;
  }
  if (!fs.existsSync(live)) {
    console.log(`[app-build-guard] ${relLabel(live)} not found — nothing to hide.`);
    return;
  }
  fs.cpSync(live, stash, { recursive: true });
  rimraf(live);
  console.log(
    `[app-build-guard] Copied ${relLabel(live)} → ${relLabel(stash)} and removed original`,
  );
}

function restoreOne({ live, stash }) {
  if (!fs.existsSync(stash)) return;
  if (fs.existsSync(live)) {
    console.warn(
      `[app-build-guard] ${relLabel(live)} reappeared alongside stash — merging by deleting live copy first.`,
    );
    rimraf(live);
  }
  fs.cpSync(stash, live, { recursive: true });
  rimraf(stash);
  console.log(`[app-build-guard] Restored ${relLabel(stash)} → ${relLabel(live)}`);
}

function hide() {
  assertNoDev();
  TARGETS.forEach(hideOne);
}

function restore() {
  TARGETS.forEach(restoreOne);
}

const action = process.argv[2];
if (action === "hide") hide();
else if (action === "restore") restore();
else {
  console.error("Usage: app-build-guard.js hide|restore");
  process.exit(1);
}
