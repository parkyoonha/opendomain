"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";

export default function AuthMenu() {
  const { authUser, authReady, setLoginModalOpen, signOut } = useIdea();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!authReady) return null;

  if (!authUser) {
    return (
      <button
        onClick={() => setLoginModalOpen(true)}
        aria-label="로그인"
        title="로그인"
        className="safe-top-offset absolute right-[6.5rem] z-30 hidden h-8 items-center gap-1 rounded-md bg-white/[0.08] px-3 text-[10px] text-text-secondary hover:bg-white/[0.16] hover:text-text-primary md:flex"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path
            d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>로그인</span>
      </button>
    );
  }

  const email = authUser.email ?? "";
  const displayName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    email ??
    "계정";
  const avatarUrl = authUser.user_metadata?.avatar_url as string | undefined;
  const initial = (displayName || email || "?").slice(0, 1).toUpperCase();

  return (
    <div
      ref={menuRef}
      className="safe-top-offset absolute right-[6.5rem] z-30 hidden md:block"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="계정 메뉴"
        title={email || displayName}
        className="flex h-9 items-center gap-2 rounded-full bg-white/[0.08] pl-1 pr-3 text-[13px] text-text-primary hover:bg-white/[0.16] md:h-8 md:text-[10px]"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full md:h-6 md:w-6"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.16] text-[11px] font-bold md:h-6 md:w-6 md:text-[10px]">
            {initial}
          </span>
        )}
        <span className="max-w-[8rem] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] w-56 rounded-md bg-neutral-900 p-2 shadow-2xl ring-1 ring-white/10">
          <div className="px-2 py-2">
            <div className="truncate text-[12px] font-semibold text-text-primary">
              {displayName}
            </div>
            {email && email !== displayName && (
              <div className="mt-0.5 truncate text-[11px] text-text-muted">
                {email}
              </div>
            )}
          </div>
          <div className="my-1 h-px bg-white/10" />
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="w-full rounded px-2 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
