"use client";

import { useEffect, useRef } from "react";
import { useIdea } from "../state/IdeaContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Left-anchored drawer triggered from the mobile top-left hamburger.
// Lists past topic sessions (pages with type === "topic") so the user
// can switch between what they've explored.
export default function SessionHistoryDrawer({ open, onClose }: Props) {
  const { pages, currentPageId, openPage, startTopicDraft } = useIdea();
  const drawerRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  const topicPages = pages
    .filter((p) => p.type === "topic")
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      {/* On mobile the overlay + drawer stop above the bottom-nav /
          home indicator so the user can still reach the nav. On
          desktop they take full height — no bottom nav to clear. */}
      <div className="bottom-safe-14 fixed inset-x-0 top-0 z-50 bg-black/50 md:bottom-0" />
      <div
        ref={drawerRef}
        className="pt-safe-8 bottom-safe-14 fixed left-0 top-0 z-50 flex w-[80vw] max-w-[320px] flex-col bg-neutral-900 shadow-2xl md:bottom-0 md:w-80"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="text-[13px] font-semibold text-text-primary">
            세션 히스토리
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={() => {
            startTopicDraft();
            onClose();
          }}
          className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-white/[0.08] px-3 py-2 text-left text-[13px] text-text-primary hover:bg-white/[0.14]"
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
        <div className="mt-3 overflow-y-auto px-3 pb-3">
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
      </div>
    </>
  );
}
