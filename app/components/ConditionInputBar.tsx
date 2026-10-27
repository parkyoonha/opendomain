"use client";

import { useState } from "react";

/**
 * 모든 컨트롤러(PendingTopic / Axis / Facet) 상단에 공통으로 쓰는 입력바.
 *
 * - 현재 facet 명을 비편집 태그로 표시 (제거 불가, 정체성 표시용).
 * - principleCustomContext[pk] 에 저장된 "추가 조건"들을 `\n` 로 조인된
 *   하나의 문자열로 보관하고, 여기선 각 줄을 별도 태그(각 X로 제거)로 렌더.
 * - 입력창은 조건 입력 전용. Enter → 조건 태그로 추가.
 * - 제출 버튼은 현재 모드(분해/확장/증명) 액션을 트리거. 입력창에 draft가
 *   있으면 자동으로 조건 커밋 후 제출 (사용자가 Enter를 잊어도 손실 없음).
 */
export default function ConditionInputBar({
  tagText,
  pk,
  submitting = false,
  disabled = false,
  existingContext,
  setPrincipleCustomContext,
  onSubmit,
}: {
  tagText: string;
  pk: string;
  submitting?: boolean;
  disabled?: boolean;
  existingContext: string;
  setPrincipleCustomContext: (pk: string, text: string) => void;
  onSubmit: () => void;
}) {
  const [draft, setDraft] = useState("");
  const conditions = existingContext
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const addCondition = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const next = [...conditions, t].join("\n");
    setPrincipleCustomContext(pk, next);
    setDraft("");
  };
  const removeCondition = (idx: number) => {
    const next = conditions.filter((_, i) => i !== idx).join("\n");
    setPrincipleCustomContext(pk, next);
  };
  const submit = () => {
    if (draft.trim()) addCondition(draft);
    onSubmit();
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-white/[0.12] py-2 pl-2 pr-1.5">
      {/* 현재 facet 태그 — 비편집, 제거 불가 */}
      <span className="inline-flex max-w-full items-center rounded-full bg-white/[0.22] px-3 py-1.5 text-[14px] font-medium text-text-primary md:text-[12px]">
        <span className="truncate">{tagText}</span>
      </span>
      {/* 추가 조건 태그들 */}
      {conditions.map((c, i) => (
        <span
          key={`cond-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.1] py-1.5 pl-3 pr-1 text-[13px] text-text-primary md:text-[11px]"
          title={c}
        >
          <span className="max-w-[140px] truncate">+ {c}</span>
          <button
            type="button"
            onClick={() => removeCondition(i)}
            aria-label="조건 제거"
            className="rounded-full p-0.5 text-text-muted hover:bg-white/10 hover:text-text-primary"
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
        </span>
      ))}
      {/* 조건 입력 — Enter로 조건 태그 생성 */}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (draft.trim()) addCondition(draft);
          }
        }}
        placeholder={conditions.length === 0 ? "추가 조건 입력" : "조건 추가"}
        className="min-w-[100px] flex-1 bg-transparent px-2 py-1.5 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[12px]"
      />
      {/* 제출 — 현재 모드 액션 */}
      <button
        type="button"
        onClick={submit}
        disabled={disabled || submitting}
        aria-label="제출"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 md:h-9 md:w-9 ${
          submitting ? "bg-white/[0.15] text-white" : "bg-white text-black"
        }`}
      >
        {submitting ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 animate-spin"
            aria-label="제출 중"
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
  );
}
