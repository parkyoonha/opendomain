"use client";

import { useEffect, useRef, useState } from "react";
import { useIdea, type InputMode } from "../state/IdeaContext";
import { apiPath } from "@/lib/apiPath";
import { kBuiltinDirections } from "@/lib/directions";
import CanvasEditor from "./CanvasEditor";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";

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
    memoInputFocusTick,
    topicDirectionId,
    setTopicDirectionId,
    topicResultType,
    setTopicResultType,
    selectedLens,
    setSelectedLens,
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    chipPanelOpen,
    setChipPanelOpen,
    setChipPanelFullScreen,
    topicDraftTick,
  } = useIdea();
  const [memoText, setMemoText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  // Topic-mode bottom-row pickers. Only one popover may be open at a
  // time; tapping the same chip again closes it. Each chip edits its
  // own slice of the pre-enter draft state (direction / lens /
  // result-type); enter then commits using whatever is currently set.
  type TopicPopover = "direction" | "lens" | "result" | null;
  const [topicPopover, setTopicPopover] = useState<TopicPopover>(null);
  // Collapse/expand state for the topic bar. After the first submit the
  // bar shrinks to a compact single-row pill at the top; refocusing the
  // text field re-expands it with the chip-button row. startTopicDraft
  // resets this so a fresh draft starts in the expanded layout.
  const [inputFocused, setInputFocused] = useState(false);
  const [committedOnce, setCommittedOnce] = useState(false);
  // Image / canvas uploads stage here as thumbnails above the text
  // row. On submit the memo wraps text (top) + attachments (bottom)
  // into a single entry.
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachWrapperRef = useRef<HTMLDivElement>(null);
  const topicPopoverWrapperRef = useRef<HTMLElement | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Focus the text input whenever a flow (e.g. "+ 새 메모방" dialog)
  // requests it via requestMemoInputFocus(). The tick increments, this
  // effect fires, focus moves.
  useEffect(() => {
    if (memoInputFocusTick === 0) return;
    textInputRef.current?.focus();
  }, [memoInputFocusTick]);

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

  // Same outside-tap-closes behavior for the topic chip-row popovers.
  useEffect(() => {
    if (topicPopover === null) return;
    const onDown = (e: MouseEvent) => {
      if (!topicPopoverWrapperRef.current) return;
      if (!topicPopoverWrapperRef.current.contains(e.target as Node)) {
        setTopicPopover(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [topicPopover]);

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

  const hasAttachments =
    inputMode === "memo" && pendingAttachments.length > 0;
  const canSubmit =
    (value.trim().length > 0 || hasAttachments) && !busy;

  // Collapsed = compact single-row look. True only after the user has
  // submitted at least once AND the input isn't currently focused.
  const topicCollapsed =
    inputMode === "topic" && committedOnce && !inputFocused;

  // Reset the collapsed-after-submit flag whenever startTopicDraft is
  // called (drawer "새 주제 시작" etc). Watching topicText / currentPageId
  // doesn't work: runDecompose synchronously nulls currentPageId before
  // the await, so a submit would briefly satisfy a text/page-based check
  // and incorrectly reset the flag. The dedicated tick fires only on
  // user-initiated drafts.
  useEffect(() => {
    if (topicDraftTick === 0) return;
    setCommittedOnce(false);
  }, [topicDraftTick]);

  const submit = () => {
    if (!canSubmit) return;
    if (inputMode === "topic") {
      void runDecompose();
      setCommittedOnce(true);
      // Blur so the cursor leaves the field after enter — the pending
      // topic card below gets focus, and the on-screen keyboard (mobile)
      // can collapse so the user actually sees the decomposition.
      textInputRef.current?.blur();
    } else {
      const textPart = memoText.trim();
      const attachmentPart = pendingAttachments.join("\n");
      const combined =
        textPart && attachmentPart
          ? `${textPart}\n${attachmentPart}`
          : textPart || attachmentPart;
      addMemo(combined);
      setMemoText("");
      setPendingAttachments([]);
    }
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments((cur) => cur.filter((_, i) => i !== idx));
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
      // Upload in parallel; stage URLs as pending attachments so the
      // user can add text (+ more images) before posting a single memo.
      const urls = await Promise.all(files.map((f) => uploadBlob(f)));
      setPendingAttachments((cur) => [...cur, ...urls]);
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
  // CanvasEditor save callback. `close=false` means "다음 캔버스" —
  // save as pending attachment, keep the editor open with a cleared
  // canvas. `close=true` means "저장" — save pending and close.
  const onCanvasSave = async (blob: Blob, close: boolean) => {
    if (close) setCanvasOpen(false);
    setUploadingImage(true);
    try {
      const url = await uploadBlob(blob, `canvas-${Date.now()}.png`);
      setPendingAttachments((cur) => [...cur, url]);
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
    <div
      className={`bg-black px-3 md:px-6 md:pt-2 ${
        topicCollapsed ? "pt-14" : "pt-2"
      }`}
    >
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
      {hasAttachments && (
        <div className="mx-auto mb-2 flex gap-1.5 overflow-x-auto md:max-w-[760px]">
          {pendingAttachments.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative shrink-0 overflow-hidden rounded-md bg-white/[0.06]"
              style={{ aspectRatio: "3 / 4", height: "4.5rem" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                aria-label="첨부 제거"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {inputMode === "topic" && topicCollapsed ? (
        // Post-decompose state: no text input, no enter button. Just a
        // horizontally scrollable row of applied chips so the user can
        // see / change / clear / add 사고방향·렌즈·실행결과·칩 picks.
        // Clicking a chip opens its picker inline below the row; the
        // compound chip's × clears the value. To start a new topic the
        // user opens the hamburger drawer → 새 주제 시작, which resets
        // committedOnce and restores the full input bar.
        <div
          ref={(el) => {
            topicPopoverWrapperRef.current = el;
          }}
          className="mx-auto flex flex-col gap-2 md:max-w-[760px]"
        >
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1">
            <TopicChipButton
              label="사고방향"
              value={
                topicDirectionId !== "principle"
                  ? kBuiltinDirections.find((d) => d.id === topicDirectionId)
                      ?.label ??
                    customDirections.find((d) => d.id === topicDirectionId)
                      ?.label
                  : undefined
              }
              active={topicPopover === "direction"}
              onClick={() =>
                setTopicPopover((p) => (p === "direction" ? null : "direction"))
              }
              onRemove={() => setTopicDirectionId("principle")}
            />
            <TopicChipButton
              label="렌즈"
              value={
                selectedLens
                  ? `${selectedLens.discipline}${selectedLens.scholar ? ` · ${selectedLens.scholar}` : ""}`
                  : undefined
              }
              active={topicPopover === "lens"}
              onClick={() =>
                setTopicPopover((p) => (p === "lens" ? null : "lens"))
              }
              onRemove={() => setSelectedLens(null)}
            />
            <TopicChipButton
              label="실행결과"
              value={topicResultType ?? undefined}
              active={topicPopover === "result"}
              onClick={() =>
                setTopicPopover((p) => (p === "result" ? null : "result"))
              }
              onRemove={() => setTopicResultType(null)}
            />
            <TopicChipButton
              label="칩"
              active={chipPanelOpen}
              onClick={() => {
                setTopicPopover(null);
                setChipPanelFullScreen(false);
                setChipPanelOpen(!chipPanelOpen);
              }}
            />
          </div>
          {topicPopover !== null && (
            <div className="rounded-lg bg-white/[0.06] p-3">
              {topicPopover === "direction" && (
                <DirectionChipRow
                  currentDirection={topicDirectionId}
                  customDirections={customDirections}
                  onChangeDirection={setTopicDirectionId}
                  addCustomDirection={addCustomDirection}
                  removeCustomDirection={removeCustomDirection}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
              {topicPopover === "lens" && (
                <FacetLensRow
                  currentLens={selectedLens}
                  onChangeLens={setSelectedLens}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
              {topicPopover === "result" && (
                <ResultTypeChipRow
                  value={topicResultType}
                  onChange={setTopicResultType}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
            </div>
          )}
        </div>
      ) : (
      <form
        ref={(el) => {
          topicPopoverWrapperRef.current = el;
        }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`mx-auto flex flex-col gap-2 bg-white/[0.12] md:max-w-[760px] ${
          inputMode === "topic" && !topicCollapsed
            ? "rounded-3xl p-3"
            : "rounded-full py-3 pl-3 pr-2"
        }`}
      >
        <div className="flex items-center gap-2">
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
                className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary disabled:opacity-40 md:h-9 md:w-9"
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
          <input
            ref={textInputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              document.body.classList.add("inputbar-focused");
              setInputFocused(true);
            }}
            onBlur={() => {
              document.body.classList.remove("inputbar-focused");
              setInputFocused(false);
            }}
            placeholder={current.placeholder}
            className="flex-1 bg-transparent px-1 py-2 text-[16px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[14px]"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="제출"
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-30 md:h-9 md:w-9 ${
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
        </div>

        {/* Inline picker: expands the InputBar vertically to hold the
            selected category's picker (사고방향 / 렌즈 / 실행결과). No
            absolute positioning, no dropdown — the bar simply grows.
            Picking a value inside DOES NOT auto-submit; the picker
            stays open so the user can see their choice and then click
            enter manually. Toggle off by re-clicking the chip. */}
        {inputMode === "topic" &&
          !topicCollapsed &&
          topicPopover !== null && (
            <div className="rounded-lg bg-white/[0.06] p-3">
              {topicPopover === "direction" && (
                <DirectionChipRow
                  currentDirection={topicDirectionId}
                  customDirections={customDirections}
                  onChangeDirection={setTopicDirectionId}
                  addCustomDirection={addCustomDirection}
                  removeCustomDirection={removeCustomDirection}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
              {topicPopover === "lens" && (
                <FacetLensRow
                  currentLens={selectedLens}
                  onChangeLens={setSelectedLens}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
              {topicPopover === "result" && (
                <ResultTypeChipRow
                  value={topicResultType}
                  onChange={setTopicResultType}
                  collapsed={false}
                  onCollapseChange={() => {}}
                />
              )}
            </div>
          )}

        {/* Topic-mode bottom row: four chip buttons for direction /
            lens / result-type / chip-panel. Clicking +사고방향 /
            +렌즈 / +실행결과 toggles the inline picker above; +칩
            opens the ChipSidePanel as a bottom sheet. */}
        {inputMode === "topic" && !topicCollapsed && (
          <div className="flex items-center gap-1.5 pl-1">
            <TopicChipButton
              label="사고방향"
              value={
                topicDirectionId !== "principle"
                  ? kBuiltinDirections.find((d) => d.id === topicDirectionId)
                      ?.label ??
                    customDirections.find((d) => d.id === topicDirectionId)
                      ?.label
                  : undefined
              }
              active={topicPopover === "direction"}
              onClick={() =>
                setTopicPopover((p) => (p === "direction" ? null : "direction"))
              }
            />
            <TopicChipButton
              label="렌즈"
              value={
                selectedLens
                  ? `${selectedLens.discipline}${selectedLens.scholar ? ` · ${selectedLens.scholar}` : ""}`
                  : undefined
              }
              active={topicPopover === "lens"}
              onClick={() =>
                setTopicPopover((p) => (p === "lens" ? null : "lens"))
              }
            />
            <TopicChipButton
              label="실행결과"
              value={topicResultType ?? undefined}
              active={topicPopover === "result"}
              onClick={() =>
                setTopicPopover((p) => (p === "result" ? null : "result"))
              }
            />
            {/* +칩 opens the ChipSidePanel as a bottom sheet rather
                than an inline picker — chip exploration needs the full
                tabbed panel (library / 유사칩 / 검색 / 히스토리). */}
            <TopicChipButton
              label="칩"
              active={chipPanelOpen}
              onClick={() => {
                setTopicPopover(null);
                setChipPanelFullScreen(false);
                setChipPanelOpen(!chipPanelOpen);
              }}
            />
          </div>
        )}
      </form>
      )}
    </div>
  );
}

// Bottom-row chip button for the topic input bar. Shows "+label" when
// no value is set, "label · value" when the user has picked something.
// Active = the button's own popover is currently open. onRemove, when
// provided and a value is present, surfaces an inline × to clear.
function TopicChipButton(props: {
  label: string;
  value?: string;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const { label, value, active, onClick, onRemove } = props;
  const base = `shrink-0 rounded-full text-[13px] transition-colors md:text-[12px] ${
    active
      ? "bg-white/[0.18] text-text-primary"
      : value
        ? "bg-white/[0.10] text-text-primary hover:bg-white/[0.16]"
        : "bg-white/[0.06] text-text-muted hover:bg-white/[0.12] hover:text-text-secondary"
  }`;
  if (value && onRemove) {
    // Compound chip: value side opens picker, × side clears. Pill
    // visually one unit; the inner buttons share the pill background.
    return (
      <span className={`inline-flex items-center ${base}`}>
        <button
          type="button"
          onClick={onClick}
          className="rounded-full py-2 pl-3.5 pr-2"
        >
          {label} · {value}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} 지우기`}
          className="rounded-full py-2 pl-1 pr-3 text-text-muted hover:text-text-primary"
        >
          ×
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} px-3.5 py-2`}
    >
      {value ? `${label} · ${value}` : `+${label}`}
    </button>
  );
}
