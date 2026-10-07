"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea, type Page, type Memo } from "../state/IdeaContext";
import {
  CANVAS_URL_HINT,
  IMAGE_URL_RE,
  LINK_URL_RE,
  useLinkMeta,
} from "./MemoStack";

export default function MemoFolderList() {
  const {
    pages,
    memos,
    openPage,
    deletePage,
    createEmptyMemoPage,
    renameMemoPage,
    pinnedMemoPageIds,
    togglePinMemoPage,
  } = useIdea();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDraft, setDialogDraft] = useState("");

  const memoPages = pages.filter((p) => p.type === "memo");

  // Pinned folders first, then newest-first by createdAt.
  const sortedPages = [...memoPages].sort((a, b) => {
    const ap = pinnedMemoPageIds.has(a.id) ? 1 : 0;
    const bp = pinnedMemoPageIds.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.createdAt - a.createdAt;
  });

  const confirmCreate = () => {
    const trimmed = dialogDraft.trim();
    if (!trimmed) return;
    createEmptyMemoPage(trimmed);
    setDialogDraft("");
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => {
          setDialogDraft("");
          setDialogOpen(true);
        }}
        className="flex items-center gap-2 self-start rounded-md bg-white/[0.08] px-3 py-2 text-[13px] text-text-primary hover:bg-white/[0.14]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>새 메모방</span>
      </button>
      {sortedPages.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center text-text-muted">
          <p className="text-[13px]">저장된 메모방이 없습니다</p>
          <p className="text-[11px]">위 입력바에 메모를 기록하거나 "새 메모방"으로 시작하세요</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {sortedPages.map((p) => (
            <MemoFolderCard
              key={p.id}
              page={p}
              memos={memos}
              pinned={pinnedMemoPageIds.has(p.id)}
              onOpen={() => openPage(p.id)}
              onDelete={() => {
                if (confirm("이 메모방을 삭제하시겠어요?")) deletePage(p.id);
              }}
              onRename={(title) => renameMemoPage(p.id, title)}
              onTogglePin={() => togglePinMemoPage(p.id)}
            />
          ))}
        </div>
      )}
      {dialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-lg bg-neutral-900 p-4 shadow-2xl">
            <div className="mb-3 text-[14px] font-semibold text-text-primary">
              새 메모방
            </div>
            <input
              autoFocus
              value={dialogDraft}
              onChange={(e) => setDialogDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCreate();
                } else if (e.key === "Escape") {
                  setDialogOpen(false);
                }
              }}
              placeholder="메모방 이름"
              className="w-full rounded-md bg-white/[0.08] px-3 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-md px-3 py-1.5 text-[13px] text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
              >
                취소
              </button>
              <button
                onClick={confirmCreate}
                disabled={!dialogDraft.trim()}
                className="rounded-md bg-white px-3 py-1.5 text-[13px] font-bold text-black hover:opacity-90 disabled:opacity-40"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CardProps = {
  page: Page;
  memos: Memo[];
  pinned: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onTogglePin: () => void;
};

// Each folder card:
//   row 1 — room name (left) + ⋯ menu button (right, hover on desktop)
//   row 2 — preview derived from latest memo (link title / 이미지 /
//            캔버스 / text first line)
//   row 3 — createdAt (left) + 메모 N개 count (right)
// Long-press on mobile OR ⋯ click on desktop opens an in-card action
// menu: 메모방명 설정 / 상단 고정 / 메모방 삭제.
function MemoFolderCard({
  page,
  memos,
  pinned,
  onOpen,
  onDelete,
  onRename,
  onTogglePin,
}: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(page.title);
  const menuWrapperRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuWrapperRef.current) return;
      if (!menuWrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const latestId = page.memoIds?.[0];
  const latestMemo = latestId
    ? memos.find((m) => m.id === latestId)
    : undefined;
  const firstLine =
    latestMemo?.text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  const isCanvas =
    IMAGE_URL_RE.test(firstLine) && CANVAS_URL_HINT.test(firstLine);
  const isImage = !isCanvas && IMAGE_URL_RE.test(firstLine);
  const isLink =
    !isCanvas && !isImage && LINK_URL_RE.test(firstLine);
  const linkMeta = useLinkMeta(isLink ? firstLine : null);
  let preview: string;
  if (isCanvas) preview = "(캔버스)";
  else if (isImage) preview = "(이미지)";
  else if (isLink) preview = linkMeta?.title ?? firstLine;
  else preview = firstLine || "(비어 있음)";

  const startLongPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      setMenuOpen(true);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== page.title) onRename(trimmed);
    setRenaming(false);
    setMenuOpen(false);
  };

  return (
    <div
      ref={menuWrapperRef}
      className={`group relative flex w-[max(20vw,220px)] flex-col gap-2 rounded-lg bg-white/[0.05] p-4 transition-colors hover:bg-white/[0.08] max-[400px]:w-[calc(100vw-3rem)] ${
        pinned ? "ring-1 ring-amber-400/40" : ""
      }`}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") startLongPress();
      }}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerMove={cancelLongPress}
      onContextMenu={(e) => {
        // Suppress browser context menu on long-press / right-click.
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                setRenameDraft(page.title);
                setRenaming(false);
              }
            }}
            onBlur={commitRename}
            className="min-w-0 flex-1 rounded bg-white/[0.08] px-1.5 py-0.5 text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-white/30"
          />
        ) : (
          <div
            className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
              pinned ? "text-amber-100" : "text-text-primary"
            }`}
          >
            {pinned && <span className="mr-1 text-amber-300">📌</span>}
            {page.title || "제목 없음"}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          aria-label="메모방 메뉴"
          className="rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-text-primary focus:opacity-100 group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <circle cx="5" cy="12" r="1.3" fill="currentColor" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" />
            <circle cx="19" cy="12" r="1.3" fill="currentColor" />
          </svg>
        </button>
      </div>
      <button
        onClick={onOpen}
        className="min-h-[3rem] text-left"
      >
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-[12px] leading-5 text-text-primary">
          {preview}
        </p>
      </button>
      <div className="flex items-end justify-between gap-2 text-[10px] text-text-muted">
        <span>
          {new Date(page.createdAt).toLocaleString("ko-KR", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-text-secondary">
          메모 {page.memoIds?.length ?? 0}개
        </span>
      </div>
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-md border border-white/10 bg-neutral-900 text-[12px] text-text-primary shadow-xl"
        >
          <button
            onClick={() => {
              setRenameDraft(page.title);
              setRenaming(true);
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left hover:bg-white/[0.08]"
          >
            메모방명 설정
          </button>
          <button
            onClick={() => {
              onTogglePin();
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left hover:bg-white/[0.08]"
          >
            {pinned ? "상단 고정 해제" : "상단 고정"}
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-rose-200 hover:bg-rose-500/10"
          >
            메모방 삭제
          </button>
        </div>
      )}
    </div>
  );
}
