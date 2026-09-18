"use client";

import { useIdea } from "../state/IdeaContext";

export default function MemoFolderList() {
  const { pages, openPage, deletePage } = useIdea();
  const memoPages = pages.filter((p) => p.type === "memo");

  if (memoPages.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-2 text-center text-text-muted">
        <p className="text-[13px]">저장된 메모 폴더가 없습니다</p>
        <p className="text-[11px]">위 입력바에 메모를 기록하면 폴더가 생깁니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {memoPages.map((p) => (
        <div
          key={p.id}
          className="group relative flex w-[max(20vw,220px)] flex-col gap-2 rounded-lg bg-white/[0.05] p-4 transition-colors hover:bg-white/[0.08] max-[400px]:w-[calc(100vw-3rem)]"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-text-secondary">
              메모 {p.memoIds?.length ?? 0}개
            </span>
            <button
              onClick={() => {
                if (confirm("이 메모 폴더를 삭제하시겠어요?"))
                  deletePage(p.id);
              }}
              aria-label="삭제"
              className="rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-text-primary focus:opacity-100 group-hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
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
            onClick={() => openPage(p.id)}
            className="min-h-[3rem] text-left"
          >
            <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-text-primary">
              {p.title}
            </p>
          </button>
          <div className="text-[10px] text-text-muted">
            {new Date(p.createdAt).toLocaleString("ko-KR", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
