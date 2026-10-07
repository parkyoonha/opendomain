"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { apiPath } from "@/lib/apiPath";

// Match an http(s) URL that ends in a common image extension OR looks
// like an ImgBB share URL (i.ibb.co, image.ibb.co). Covers the "paste
// a link" case and our own ImgBB uploads.
export const IMAGE_URL_RE =
  /^https?:\/\/(?:[^\s/]+\.)*(?:ibb\.co|imgur\.com|i\.imgur\.com)\/\S+$|^https?:\/\/\S+?\.(?:png|jpe?g|gif|webp|avif)(?:\?\S*)?$/i;

// Plain URL on its own line (not an image).
export const LINK_URL_RE = /^https?:\/\/\S+$/i;

// Our CanvasEditor uploads use filenames of the form
// "canvas-<timestamp>.png", and ImgBB preserves that filename in the
// returned URL (/<hash>/canvas-<ts>.png). Use that as a hint to tag
// canvas attachments distinctly from gallery images in folder-list
// previews.
export const CANVAS_URL_HINT = /\/canvas-\d+\.png(?:\?|$)/i;

// Split a memo into alternating text / image-carousel / link segments.
// Consecutive image-URL lines are grouped so multi-image uploads
// render as one horizontal scroller. A standalone non-image URL line
// becomes a link-preview card (metadata fetched from /api/unfurl-url).
type Segment =
  | { kind: "text"; text: string }
  | { kind: "images"; urls: string[] }
  | { kind: "link"; url: string };

function segmentMemo(text: string): Segment[] {
  const lines = text.split(/\n/);
  const out: Segment[] = [];
  let textBuf: string[] = [];
  let imageBuf: string[] = [];
  const flushText = () => {
    if (textBuf.length === 0) return;
    const joined = textBuf.join("\n");
    textBuf = [];
    if (joined.trim().length === 0) return;
    out.push({ kind: "text", text: joined });
  };
  const flushImages = () => {
    if (imageBuf.length === 0) return;
    out.push({ kind: "images", urls: imageBuf });
    imageBuf = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (IMAGE_URL_RE.test(trimmed)) {
      flushText();
      imageBuf.push(trimmed);
    } else if (LINK_URL_RE.test(trimmed)) {
      flushText();
      flushImages();
      out.push({ kind: "link", url: trimmed });
    } else {
      flushImages();
      textBuf.push(line);
    }
  }
  flushText();
  flushImages();
  return out;
}

type LinkMeta = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  error?: string;
};

// Module-scoped cache + in-flight dedupe. Lives for the lifetime of
// the JS runtime, so leaving and reopening a memo room (which
// remounts MemoStack) does NOT force a re-unfurl — the preview card
// renders instantly from the already-fetched result.
const linkMetaStore = new Map<string, LinkMeta>();
const linkMetaInFlight = new Map<string, Promise<LinkMeta>>();

function fetchLinkMeta(url: string): Promise<LinkMeta> {
  const existing = linkMetaInFlight.get(url);
  if (existing) return existing;
  const promise = fetch(apiPath("/api/unfurl-url"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })
    .then((res) => res.json() as Promise<LinkMeta>)
    .catch((err): LinkMeta => ({
      url,
      error: err instanceof Error ? err.message : String(err),
    }))
    .then((data) => {
      linkMetaStore.set(url, data);
      linkMetaInFlight.delete(url);
      return data;
    });
  linkMetaInFlight.set(url, promise);
  return promise;
}

// Returns a cached LinkMeta for the given URL, triggering a one-shot
// fetch when needed. `undefined` means "still loading"; a result (even
// an error) means we've resolved. Null `url` disables the fetch.
export function useLinkMeta(url: string | null): LinkMeta | undefined {
  const [meta, setMeta] = useState<LinkMeta | undefined>(() =>
    url ? linkMetaStore.get(url) : undefined,
  );
  useEffect(() => {
    if (!url) {
      setMeta(undefined);
      return;
    }
    const cached = linkMetaStore.get(url);
    if (cached) {
      setMeta(cached);
      return;
    }
    setMeta(undefined);
    let cancelled = false;
    fetchLinkMeta(url).then((data) => {
      if (cancelled) return;
      setMeta(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return meta;
}

function LinkPreviewCard({ url }: { url: string }) {
  const meta = useLinkMeta(url);
  const loading = meta === undefined;

  const hasPreview = Boolean(meta && (meta.title || meta.image));

  // In-flight: show a compact three-dot bouncer. We hide the URL
  // entirely so there's no sky-blue flash before the card lands.
  if (loading) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 py-2"
        aria-label="미리보기 로드 중"
      >
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    );
  }

  // Resolved but no useful metadata — plain clickable link so the
  // user can still open it. (Server also tries a hostname fallback,
  // so this really only kicks in when the fetch itself failed.)
  if (!hasPreview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-[13px] leading-5 text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
      >
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex overflow-hidden rounded-md bg-white/[0.05] transition-colors hover:bg-white/[0.08]"
    >
      {meta!.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta!.image}
          alt=""
          loading="lazy"
          className="h-24 w-24 shrink-0 object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
        {meta!.siteName && (
          <div className="truncate text-[10px] uppercase tracking-wider text-text-muted">
            {meta!.siteName}
          </div>
        )}
        <div className="line-clamp-2 text-[13px] font-semibold leading-5 text-text-primary">
          {meta!.title ?? url}
        </div>
        {meta!.description && (
          <div className="line-clamp-2 text-[11px] leading-4 text-text-secondary">
            {meta!.description}
          </div>
        )}
      </div>
    </a>
  );
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const textRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Esc closes the in-app image lightbox. Avoids the ImgBB redirect
  // path which rendered the image through a 3rd-party viewer that
  // looked dimmed on Capacitor's WebView.
  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  // If on a memo folder page, show only that page's memos in the recorded order
  const currentMemoPage = pages.find(
    (p) => p.id === currentPageId && p.type === "memo",
  );
  const memosToShow = currentMemoPage
    ? (currentMemoPage.memoIds ?? [])
        .map((id) => memos.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
    : memos;

  if (memosToShow.length === 0) {
    return (
      <div className="flex w-full max-w-[860px] flex-col items-center gap-1 py-10 text-center text-text-muted">
        <p className="text-[13px]">아직 메모가 없습니다</p>
        <p className="text-[11px]">하단 입력바에 첫 메모를 적어보세요</p>
      </div>
    );
  }

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
    <>
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
                className="flex flex-col gap-2 selection:bg-white/30"
              >
                {segmentMemo(m.text).map((seg, i) => {
                  if (seg.kind === "images") {
                    const single = seg.urls.length === 1;
                    // Fixed height, auto width → each tile picks up the
                    // image's natural aspect ratio instead of being
                    // squeezed into a 3:4 crop. Single-image memos get
                    // a noticeably larger tile.
                    const tileH = single
                      ? "h-[22rem] md:h-[26rem]"
                      : "h-80 md:h-96";
                    return (
                      <div
                        key={i}
                        onClick={(e) => e.stopPropagation()}
                        className="-mx-3 overflow-x-auto"
                        style={{ scrollSnapType: "x mandatory" }}
                      >
                        <div className="flex gap-1.5 px-3">
                          {seg.urls.map((url, j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxUrl(url);
                              }}
                              style={{
                                scrollSnapAlign: "start",
                                maxWidth: "88vw",
                              }}
                              className={`flex-none overflow-hidden rounded-md bg-white/[0.04] ${tileH}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                loading="lazy"
                                className="block h-full w-auto max-w-none"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (seg.kind === "link") {
                    return <LinkPreviewCard key={i} url={seg.url} />;
                  }
                  return (
                    <p
                      key={i}
                      className="whitespace-pre-wrap break-words text-[13px] leading-5 text-text-primary"
                    >
                      {seg.text}
                    </p>
                  );
                })}
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
    {lightboxUrl && (
      <div
        onClick={() => setLightboxUrl(null)}
        className="pt-safe-8 safe-bottom fixed inset-0 z-[70] flex items-center justify-center bg-black"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLightboxUrl(null);
          }}
          aria-label="닫기"
          className="safe-top-offset absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.16]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxUrl}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )}
    </>
  );
}
