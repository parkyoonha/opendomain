"use client";

import { useIdea, type Page, type Memo } from "../state/IdeaContext";
import {
  CANVAS_URL_HINT,
  IMAGE_URL_RE,
  LINK_URL_RE,
  useLinkMeta,
} from "./MemoStack";

export default function MemoFolderList() {
  const { pages, memos, openPage, deletePage, startMemoDraft } = useIdea();
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
    <div className="flex flex-col gap-3">
      <button
        onClick={startMemoDraft}
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
      <div className="flex flex-wrap gap-3">
        {memoPages.map((p) => (
          <MemoFolderCard
            key={p.id}
            page={p}
            memos={memos}
            onOpen={() => openPage(p.id)}
            onDelete={() => {
              if (confirm("이 메모 폴더를 삭제하시겠어요?")) deletePage(p.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

type CardProps = {
  page: Page;
  memos: Memo[];
  onOpen: () => void;
  onDelete: () => void;
};

// Each folder card shows a preview derived from the room's most recent
// memo (= memoIds[0], since addMemo prepends). The preview rules:
//  - Memo starts with a canvas-style ImgBB URL → "(캔버스)"
//  - Memo starts with an image URL           → "(이미지)"
//  - Memo starts with a non-image link URL   → the link's og:title
//    (fetched + cached by useLinkMeta; falls back to the raw URL
//    until the unfurl resolves)
//  - Otherwise → the first non-empty text line
function MemoFolderCard({ page, memos, onOpen, onDelete }: CardProps) {
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
  else preview = firstLine || page.title;

  return (
    <div className="group relative flex w-[max(20vw,220px)] flex-col gap-2 rounded-lg bg-white/[0.05] p-4 transition-colors hover:bg-white/[0.08] max-[400px]:w-[calc(100vw-3rem)]">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-text-secondary">
          메모 {page.memoIds?.length ?? 0}개
        </span>
        <button
          onClick={onDelete}
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
      <button onClick={onOpen} className="min-h-[3rem] text-left">
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-[12px] leading-5 text-text-primary">
          {preview}
        </p>
      </button>
      <div className="text-[10px] text-text-muted">
        {new Date(page.createdAt).toLocaleString("ko-KR", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
