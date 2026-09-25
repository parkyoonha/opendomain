"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";

type Props = {
  onOpenBusinessInfo: () => void;
};

// Desktop top-right menu button. Consolidates 사업자 정보 + 설정 into a
// single dropdown so the top bar stays tidy. AuthMenu (login/avatar) is
// rendered separately to the left of this button. On mobile the bottom-nav
// "메뉴" tab handles the same job via BottomMenuSheet.
export default function DesktopMenuButton({ onOpenBusinessInfo }: Props) {
  const { setSettingsOpen, userGeminiKey, useUserKey } = useIdea();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isFreeTier = Boolean(userGeminiKey) && useUserKey;

  return (
    <div
      ref={wrapperRef}
      className="safe-top-offset absolute right-3 z-30 hidden md:block"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="메뉴"
        title="메뉴"
        className="flex h-8 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-[10px] text-text-secondary hover:bg-white/[0.16] hover:text-text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span>메뉴</span>
        {isFreeTier && (
          <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
            무료
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] w-56 rounded-md bg-neutral-900 p-2 shadow-2xl ring-1 ring-white/10">
          <button
            onClick={() => {
              setOpen(false);
              onOpenBusinessInfo();
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
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
              setOpen(false);
              setSettingsOpen(true);
            }}
            className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
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
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isFreeTier
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/[0.12] text-text-secondary"
              }`}
            >
              {isFreeTier ? "무료" : "유료"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
