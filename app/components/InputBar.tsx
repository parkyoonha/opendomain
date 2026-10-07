"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea, type InputMode } from "../state/IdeaContext";
import { apiPath } from "@/lib/apiPath";
import CanvasEditor from "./CanvasEditor";

const modes: { key: InputMode; label: string; placeholder: string }[] = [
  {
    key: "topic",
    label: "사고확장",
    placeholder: "탐색하고 싶은 주제를 입력하세요",
  },
  { key: "memo", label: "메모", placeholder: "메모를 기록하세요" },
];

export default function InputBar() {
  const {
    inputMode,
    topicText,
    setTopicText,
    status,
    runDecompose,
    addMemo,
    currentPageId,
    startTopicDraft,
    startMemoDraft,
  } = useIdea();
  const [memoText, setMemoText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachWrapperRef = useRef<HTMLDivElement>(null);

  // Close the + popup when the user taps outside it.
  useEffect(() => {
    if (!attachMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!attachWrapperRef.current) return;
      if (!attachWrapperRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [attachMenuOpen]);

  const handleTabClick = (key: InputMode) => {
    if (key === inputMode && !currentPageId) {
      // Already in this mode on a draft — no-op
      return;
    }
    // If mode changes OR we're on an existing page, start a fresh draft
    if (key === "topic") startTopicDraft();
    else startMemoDraft();
  };

  const current = modes.find((m) => m.key === inputMode)!;

  const value = inputMode === "topic" ? topicText : memoText;

  const setValue = (v: string) => {
    if (inputMode === "topic") setTopicText(v);
    else setMemoText(v);
  };

  const busy = inputMode === "topic" && status === "loading";

  const canSubmit = value.trim().length > 0 && !busy;
  const showSearchIcon = inputMode === "topic";

  const submit = () => {
    if (!canSubmit) return;
    if (inputMode === "topic") void runDecompose();
    else {
      addMemo(memoText);
      setMemoText("");
    }
  };

  // Upload one blob (file OR canvas output) to ImgBB via Edge Function
  // and return the hosted URL. Caller is responsible for state updates.
  const uploadBlob = async (blob: Blob, filename?: string): Promise<string> => {
    const form = new FormData();
    form.append(
      "image",
      filename ? new File([blob], filename, { type: blob.type }) : blob,
    );
    const res = await fetch(apiPath("/api/upload-image"), {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? `업로드 실패 (${res.status})`);
    }
    return data.url;
  };

  // "+" menu → "이미지" → native gallery (multi-select enabled).
  const pickImages = () => {
    if (uploadingImage) return;
    setAttachMenuOpen(false);
    fileInputRef.current?.click();
  };
  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ""; // allow re-picking the same file(s)
    if (files.length === 0) return;
    setUploadingImage(true);
    try {
      // Upload all picked files in parallel so a 5-image pick doesn't
      // serialize into 5 sequential waits. Each pick posts immediately
      // as its own memo (chat-style) — the user does NOT have to press
      // Enter after. Their in-progress text draft is left untouched.
      const urls = await Promise.all(files.map((f) => uploadBlob(f)));
      addMemo(urls.join("\n"));
    } catch (err) {
      alert(
        "이미지 업로드 실패: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // "+" menu → "캔버스" → opens the drawing editor. The editor returns
  // a PNG blob on save; we upload it like any other image.
  const openCanvas = () => {
    setAttachMenuOpen(false);
    setCanvasOpen(true);
  };
  const onCanvasSave = async (blob: Blob) => {
    setCanvasOpen(false);
    setUploadingImage(true);
    try {
      const url = await uploadBlob(blob, `canvas-${Date.now()}.png`);
      // Chat-style: canvas posts immediately as its own memo. Keep the
      // user's text draft intact so they can keep composing.
      addMemo(url);
    } catch (err) {
      alert(
        "캔버스 업로드 실패: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="bg-black px-3 pt-2 md:px-6">
      <div className="mb-2 hidden justify-center gap-1 md:flex">
        {modes.map((m) => {
          const active = inputMode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => handleTabClick(m.key)}
              className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                active
                  ? "bg-white/[0.12] text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              title={
                active && !currentPageId
                  ? undefined
                  : `새 ${m.label} 시작`
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {inputMode === "memo" && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onImageSelected}
          className="hidden"
        />
      )}
      {canvasOpen && (
        <CanvasEditor
          onSave={onCanvasSave}
          onCancel={() => setCanvasOpen(false)}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto flex items-center gap-2 rounded-full bg-white/[0.12] py-1 pl-2 pr-1 md:max-w-[760px]"
      >
        {inputMode === "memo" && (
          <div
            ref={attachWrapperRef}
            className="relative flex items-center"
          >
            <button
              type="button"
              onClick={() => setAttachMenuOpen((v) => !v)}
              disabled={uploadingImage}
              aria-label="첨부 메뉴 열기"
              title="이미지 / 캔버스 첨부"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-40 md:h-7 md:w-7"
            >
              {uploadingImage ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 animate-spin"
                  aria-label="업로드 중"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 md:h-4 md:w-4">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            {attachMenuOpen && (
              <div className="absolute bottom-full left-0 z-40 mb-2 w-32 overflow-hidden rounded-md border border-white/10 bg-neutral-900 shadow-2xl">
                <button
                  type="button"
                  onClick={pickImages}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-white/[0.08]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="9"
                      cy="10"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3 17l5-4 4 3 4-5 5 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  이미지
                </button>
                <button
                  type="button"
                  onClick={openCanvas}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-white/[0.08]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M4 20l4-1 11-11a2.5 2.5 0 0 0-3.5-3.5L4.5 15.5 4 20z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  캔버스
                </button>
              </div>
            )}
          </div>
        )}
        {showSearchIcon && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 text-text-muted"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={current.placeholder}
          className="flex-1 bg-transparent px-1 py-1 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[13px]"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="제출"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-30 md:h-7 md:w-7 ${
            busy
              ? "bg-white/[0.15] text-white"
              : "bg-white text-black"
          }`}
        >
          {busy ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 animate-spin"
              aria-label="로딩"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
