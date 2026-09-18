"use client";

import { useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";

export default function MemoStack() {
  const {
    memos,
    removeMemo,
    memoAsTopic,
    memoAsChip,
    startChipify,
    selectedPrinciple,
    status,
    combineStatus,
    currentPageId,
    pages,
  } = useIdea();
  const [openMemoId, setOpenMemoId] = useState<string | null>(null);
  const textRefs = useRef<Map<string, HTMLElement>>(new Map());

  // If on a memo folder page, show only that page's memos in the recorded order
  const currentMemoPage = pages.find(
    (p) => p.id === currentPageId && p.type === "memo",
  );
  const memosToShow = currentMemoPage
    ? (currentMemoPage.memoIds ?? [])
        .map((id) => memos.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
    : memos;

  if (memosToShow.length === 0) return null;

  const chipDisabled = !selectedPrinciple;

  // Read selected text within this memo's text element, if any.
  const getSelectionInside = (memoId: string): string | null => {
    if (typeof window === "undefined") return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text) return null;
    const el = textRefs.current.get(memoId);
    if (!el) return null;
    // Check if selection is inside this memo's text element
    const range = sel.getRangeAt(0);
    if (
      el.contains(range.startContainer) &&
      el.contains(range.endContainer)
    ) {
      return text;
    }
    return null;
  };

  return (
    <div className="mb-3 flex w-full max-w-[860px] flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        메모
      </div>
      {memosToShow.map((m) => {
        const busy = status === "loading" || combineStatus === "loading";
        const isOpen = openMemoId === m.id;
        return (
          <div key={m.id} className="flex w-full flex-col gap-1.5">
            <div
              onClick={() => {
                if (typeof window !== "undefined") {
                  const sel = window.getSelection();
                  if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
                    // Preserve text selection — don't toggle
                    return;
                  }
                }
                setOpenMemoId(isOpen ? null : m.id);
              }}
              className={`w-full cursor-pointer rounded-lg p-4 transition-colors ${
                isOpen
                  ? "bg-white/[0.1]"
                  : "bg-white/[0.05] hover:bg-white/[0.08]"
              }`}
            >
              <p
                ref={(el) => {
                  if (el) textRefs.current.set(m.id, el);
                  else textRefs.current.delete(m.id);
                }}
                className="whitespace-pre-wrap break-words text-[11px] leading-4 text-text-primary selection:bg-white/30"
              >
                {m.text}
              </p>
            </div>
            {isOpen && (
              <div className="flex flex-wrap items-center gap-1 pl-2">
                <button
                  onClick={() => {
                    const sel = getSelectionInside(m.id);
                    void memoAsTopic(m.id, sel ?? undefined);
                  }}
                  disabled={busy}
                  title="이 메모(또는 선택 부분)를 사고확장 주제로 삼아 분해 시작"
                  className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:bg-white/90 disabled:opacity-40"
                >
                  분해하기
                </button>
                <button
                  onClick={() => {
                    const sel = getSelectionInside(m.id);
                    startChipify(m.id, sel ?? undefined);
                  }}
                  title="이 메모(또는 선택 부분)를 재사용 가능한 칩으로 저장"
                  className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-text-primary hover:bg-white/[0.16]"
                >
                  → 칩화
                </button>
                <button
                  onClick={() => void memoAsChip(m.id)}
                  disabled={busy || chipDisabled}
                  title={
                    chipDisabled
                      ? "사고확장 보드에서 원리를 먼저 선택하세요"
                      : `선택 원리(${selectedPrinciple?.axis})에 조합칩으로 삽입`
                  }
                  className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-text-primary hover:bg-white/[0.16] disabled:opacity-30"
                >
                  → 원리에 칩으로
                </button>
                <button
                  onClick={() => removeMemo(m.id)}
                  className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-text-muted hover:bg-white/[0.12] hover:text-text-primary"
                >
                  삭제
                </button>
                <span className="ml-1 text-[9px] text-text-muted">
                  텍스트 일부를 드래그 선택하면 그 부분만 사용됩니다
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
