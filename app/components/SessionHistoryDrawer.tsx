"use client";

import { useEffect, useRef } from "react";
import { useIdea } from "../state/IdeaContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenBusinessInfo: () => void;
};

// Left-anchored drawer. The top is a blank tap-to-close zone (no
// header text / line / × button); past topic sessions sit in the
// middle; the account / 사업자정보 / 설정 / 로그아웃 options that used
// to live in BottomMenuSheet are now pinned to the bottom of this
// panel. Supports left-swipe close + outside-click close.
export default function SessionHistoryDrawer({
  open,
  onClose,
  onOpenBusinessInfo,
}: Props) {
  const {
    pages,
    currentPageId,
    openPage,
    startTopicDraft,
    authUser,
    authReady,
    setLoginModalOpen,
    signOut,
    setSettingsOpen,
    userGeminiKey,
    useUserKey,
  } = useIdea();
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!drawerRef.current) return;
      if (!drawerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, [open, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Right-to-left swipe closes the drawer.
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      touchStartRef.current = null;
      onClose();
    }
  };
  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  if (!open) return null;

  const topicPages = pages
    .filter((p) => p.type === "topic")
    .sort((a, b) => b.createdAt - a.createdAt);

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
    <>
      <div className="bottom-safe-14 fixed inset-x-0 top-0 z-50 bg-black/50 md:bottom-0" />
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="pt-safe-8 bottom-safe-14 fixed left-0 top-0 z-50 flex w-[80vw] max-w-[320px] flex-col bg-neutral-900 shadow-2xl md:bottom-0 md:w-80"
      >
        {/* Top blank zone — tap to close the drawer. */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="h-10 w-full shrink-0 cursor-pointer"
        />
        <div className="px-3">
          <button
            onClick={() => {
              startTopicDraft();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-md bg-white/[0.08] px-3 py-2 text-left text-[13px] text-text-primary hover:bg-white/[0.14]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            새 주제 시작
          </button>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
          {topicPages.length === 0 ? (
            <p className="text-[12px] text-text-muted">
              아직 탐색한 주제가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {topicPages.map((p) => {
                const isActive = p.id === currentPageId;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        openPage(p.id);
                        onClose();
                      }}
                      className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-white/[0.14] text-text-primary"
                          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <div className="truncate text-[13px] font-medium">
                        {p.title || "제목 없음"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-text-muted">
                        {new Date(p.createdAt).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* Account / app menu options — pinned to the bottom. Replaces
            the mobile 메뉴 bottom-nav tab + BottomMenuSheet. */}
        <div className="shrink-0 border-t border-white/10 p-2">
          {authReady &&
            (authUser ? (
              <div className="flex items-center gap-2 rounded px-2 py-2">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.16] text-[13px] font-bold text-text-primary">
                    {initial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text-primary">
                    {displayName || "계정"}
                  </div>
                  {email && email !== displayName && (
                    <div className="truncate text-[11px] text-text-muted">
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
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[13px] text-text-primary hover:bg-white/[0.06]"
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
          <button
            onClick={() => {
              onClose();
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
              onClose();
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
          {authUser && (
            <button
              onClick={async () => {
                onClose();
                await signOut();
              }}
              className="w-full rounded px-2 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </>
  );
}
