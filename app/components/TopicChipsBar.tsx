"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { lensLabel, type SelectedLens } from "@/lib/lenses";
import FacetLensRow from "./FacetLensRow";

const keyOf = (l: SelectedLens) =>
  `${l.discipline}::${l.scholar ?? ""}::${l.isCustom ? "1" : "0"}`;

// Below the InputBar. First-time lens selection happens here (via the + button
// that opens the full picker inline). Once chosen, a tag joins the row.
// The currently active lens is highlighted; previously used lenses are dimmed
// and struck through. Tap a dim tag to make it active. × removes from history.
export default function TopicChipsBar() {
  const {
    selectedLens,
    setSelectedLens,
    lensHistory,
    removeLensFromHistory,
  } = useIdea();
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeKey = selectedLens ? keyOf(selectedLens) : null;

  return (
    <div className="flex flex-col gap-2 bg-black px-3 pt-2 md:px-6">
      <div className="mx-auto flex w-full items-center gap-2 md:max-w-[760px]">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          title={pickerOpen ? "렌즈 선택 닫기" : "렌즈 선택 열기"}
          aria-label="렌즈 추가"
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[13px] text-text-primary md:text-[11px] ${
            pickerOpen
              ? "bg-white/[0.24] hover:bg-white/[0.3]"
              : "bg-white/[0.12] hover:bg-white/[0.2]"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>렌즈</span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {lensHistory.map((lens) => {
            const k = keyOf(lens);
            const active = k === activeKey;
            return (
              <span
                key={k}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[13px] md:text-[11px] ${
                  active
                    ? "bg-white/[0.16] text-text-primary"
                    : "bg-white/[0.04] text-text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`h-3 w-3 ${active ? "opacity-80" : "opacity-40"}`}
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m20 20-4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {active ? (
                  <span>{lensLabel(lens)}</span>
                ) : (
                  <button
                    onClick={() => setSelectedLens(lens)}
                    className="line-through decoration-1 hover:text-text-primary hover:no-underline"
                    title="이 렌즈를 활성화"
                  >
                    {lensLabel(lens)}
                  </button>
                )}
                <button
                  onClick={() => removeLensFromHistory(lens)}
                  aria-label="렌즈 태그 제거"
                  className={`${
                    active ? "text-text-muted" : "text-text-muted/70"
                  } hover:text-text-primary`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>
      {pickerOpen && (
        <div className="mx-auto w-full rounded-lg bg-white/[0.04] p-3 md:max-w-[760px]">
          <FacetLensRow
            currentLens={selectedLens}
            onChangeLens={(l) => {
              setSelectedLens(l);
              if (l) setPickerOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
