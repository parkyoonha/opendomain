"use client";

import { useEffect, useRef } from "react";
import { useIdea } from "../state/IdeaContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenBusinessInfo: () => void;
};

// Bottom-anchored menu sheet triggered from the mobile bottom-nav "메뉴" tab.
// Consolidates Auth / Business Info / Settings so the top bar stays clean
// on small screens.
export default function BottomMenuSheet({
  open,
  onClose,
  onOpenBusinessInfo,
}: Props) {
  const {
    authUser,
    authReady,
    setLoginModalOpen,
    signOut,
    setSettingsOpen,
    userGeminiKey,
    useUserKey,
  } = useIdea();

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!sheetRef.current) return;
      if (!sheetRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isFreeTier = Boolean(userGeminiKey) && useUserKey;
  const email = authUser?.email ?? "";
  const displayName =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    email ??
    "";
  const avatarUrl = authUser?.user_metadata?.avatar_url as string | undefined;
  const initial = (displayName || email || "?").slice(0, 1).toUpperCase();

  return (
    <div
      // Sits just above the bottom nav (nav is bottom-0 with safe-bottom
      // padding); the sheet's bottom edge aligns with the nav's top.
      ref={sheetRef}
      className="bottom-safe-14 absolute inset-x-0 z-40 mx-2 rounded-t-lg bg-neutral-900 p-2 shadow-2xl ring-1 ring-white/10 md:hidden"
    >
      {/* Auth section */}
      {authReady &&
        (authUser ? (
          <div className="flex items-center gap-2 rounded px-2 py-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.16] text-[13px] font-bold text-text-primary">
                {initial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-text-primary">
                {displayName || "계정"}
              </div>
              {email && email !== displayName && (
                <div className="truncate text-[12px] text-text-muted">
                  {email}
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              onClose();
              setLoginModalOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-3 text-left text-[14px] text-text-primary hover:bg-white/[0.06]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
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
        ))}

      {authReady && <div className="my-1 h-px bg-white/10" />}

      <button
        onClick={() => {
          onClose();
          onOpenBusinessInfo();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-3 text-left text-[14px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 8h.01M11 12h1v5h1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>사업자 정보</span>
      </button>

      <button
        onClick={() => {
          onClose();
          setSettingsOpen(true);
        }}
        className="flex w-full items-center justify-between gap-2 rounded px-2 py-3 text-left text-[14px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>설정</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isFreeTier
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/[0.12] text-text-secondary"
          }`}
        >
          {isFreeTier ? "무료" : "유료"}
        </span>
      </button>

      {authUser && (
        <>
          <div className="my-1 h-px bg-white/10" />
          <button
            onClick={async () => {
              onClose();
              await signOut();
            }}
            className="w-full rounded px-2 py-3 text-left text-[14px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
          >
            로그아웃
          </button>
        </>
      )}
    </div>
  );
}
