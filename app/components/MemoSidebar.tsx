"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";

export default function MemoSidebar() {
  const {
    splitMemoPageId,
    setSplitMemoPageId,
    pages,
    memos,
    memoAsTopic,
    startChipify,
    removeMemo,
    addMemo,
  } = useIdea();
  const [draft, setDraft] = useState("");
  const [openMemoId, setOpenMemoId] = useState<string | null>(null);

  const page = pages.find((p) => p.id === splitMemoPageId);
  if (!page || page.type !== "memo") return null;

  const items = (page.memoIds ?? [])
    .map((id) => memos.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addMemo(trimmed);
    setDraft("");
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-black md:w-80">
      <header className="flex items-start justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            원본 메모
          </div>
          <div className="mt-0.5 truncate text-[12px] text-text-secondary">
            {page.title}
          </div>
        </div>
        <button
          onClick={() => setSplitMemoPageId(null)}
          aria-label="메모 사이드바 닫기"
          className="ml-2 shrink-0 rounded-md p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
          title="메모 사이드바 닫기"
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
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-3 mb-2 flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메모를 계속 기록하세요"
          className="flex-1 bg-transparent px-1 py-1 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          aria-label="메모 추가"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="flex flex-col gap-1.5">
          {items.map((m) => {
            const isOpen = openMemoId === m.id;
            return (
              <div key={m.id} className="flex flex-col gap-1">
                <button
                  onClick={() => setOpenMemoId(isOpen ? null : m.id)}
                  className={`w-full rounded-md p-3 text-left transition-colors ${
                    isOpen
                      ? "bg-white/[0.1]"
                      : "bg-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-text-primary">
                    {m.text}
                  </p>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap items-center gap-1 pl-2">
                    <button
                      onClick={() => void memoAsTopic(m.id)}
                      title="이 메모를 새 사고확장 주제로 분해"
                      className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:bg-white/90"
                    >
                      분해
                    </button>
                    <button
                      onClick={() => startChipify(m.id)}
                      title="이 메모를 재사용 가능한 칩으로 저장"
                      className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-text-primary hover:bg-white/[0.16]"
                    >
                      칩화
                    </button>
                    <button
                      onClick={() => removeMemo(m.id)}
                      className="ml-auto rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-text-muted hover:bg-white/[0.12] hover:text-text-primary"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="mt-4 text-center text-[11px] text-text-muted">
              이 페이지에 남은 메모가 없습니다
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
