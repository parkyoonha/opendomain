"use client";

import { useState } from "react";
import { useIdea, type InputMode } from "../state/IdeaContext";

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto flex items-center gap-2 rounded-full bg-white/[0.12] py-1 pl-3 pr-1 md:max-w-[760px]"
      >
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
