"use client";

import { useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";

// Match an http(s) URL that ends in a common image extension OR looks
// like an ImgBB share URL (i.ibb.co, image.ibb.co). Covers the "paste
// a link" case and our own ImgBB uploads.
const IMAGE_URL_RE =
  /^https?:\/\/(?:[^\s/]+\.)*(?:ibb\.co|imgur\.com|i\.imgur\.com)\/\S+$|^https?:\/\/\S+?\.(?:png|jpe?g|gif|webp|avif)(?:\?\S*)?$/i;

// Split a memo into alternating text / image segments by looking at
// each newline-separated line. A line that is JUST an image URL
// renders as an <img>; everything else stays as a text paragraph.
type Segment =
  | { kind: "text"; text: string }
  | { kind: "image"; url: string };

function segmentMemo(text: string): Segment[] {
  const lines = text.split(/\n/);
  const out: Segment[] = [];
  let textBuf: string[] = [];
  const flushText = () => {
    if (textBuf.length === 0) return;
    const joined = textBuf.join("\n");
    textBuf = [];
    if (joined.trim().length === 0) return;
    out.push({ kind: "text", text: joined });
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (IMAGE_URL_RE.test(trimmed)) {
      flushText();
      out.push({ kind: "image", url: trimmed });
    } else {
      textBuf.push(line);
    }
  }
  flushText();
  return out;
}

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
    <div className="flex w-full max-w-[860px] flex-col">
      {memosToShow.map((m, idx) => {
        const busy = status === "loading" || combineStatus === "loading";
        const isOpen = openMemoId === m.id;
        const isLast = idx === memosToShow.length - 1;
        return (
          <div
            key={m.id}
            className={`flex w-full flex-col gap-1.5 py-3 ${
              isLast ? "" : "border-b border-white/10"
            }`}
          >
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
              className="flex w-full cursor-pointer flex-col gap-2"
            >
              <div
                ref={(el) => {
                  if (el) textRefs.current.set(m.id, el);
                  else textRefs.current.delete(m.id);
                }}
                className="selection:bg-white/30"
              >
                {segmentMemo(m.text).map((seg, i) =>
                  seg.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={seg.url}
                      alt=""
                      loading="lazy"
                      className="mt-1 max-h-80 w-auto max-w-full rounded-md object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      key={i}
                      className="whitespace-pre-wrap break-words text-[13px] leading-5 text-text-primary"
                    >
                      {seg.text}
                    </p>
                  ),
                )}
              </div>
            </div>
            {isOpen && (
              <div className="flex flex-wrap items-center gap-1">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
