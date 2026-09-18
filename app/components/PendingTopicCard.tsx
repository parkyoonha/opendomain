"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { kBuiltinPurposes } from "@/lib/purposes";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";

export default function PendingTopicCard() {
  const {
    pendingTopic,
    cancelPending,
    commitPending,
    topicDirectionId,
    setTopicDirectionId,
    topicResultType,
    setTopicResultType,
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    selectedLens,
    setSelectedLens,
    status,
  } = useIdea();
  const [collapsedDir, setCollapsedDir] = useState(false);
  const [collapsedLens, setCollapsedLens] = useState(false);
  const [collapsedResult, setCollapsedResult] = useState(false);

  if (!pendingTopic) return null;

  const busy = status === "loading";

  return (
    <div className="mb-3 flex w-[calc(100vw-3rem)] max-w-full flex-col gap-3 rounded-lg bg-white/[0.05] p-4 md:w-[560px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
            주제
          </div>
          <h1 className="mt-0.5 whitespace-pre-wrap break-words text-[15px] font-bold text-text-primary">
            {pendingTopic}
          </h1>
        </div>
        <button
          onClick={cancelPending}
          aria-label="취소"
          className="shrink-0 rounded-md p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3 pt-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
            사고 목적
          </span>
          <div className="flex flex-wrap gap-1.5">
            {kBuiltinPurposes.map((p) => {
              const isDefault = p.id === "problem";
              return (
                <button
                  key={p.id}
                  disabled={busy}
                  onClick={() => void commitPending(p.id)}
                  className={`rounded-full px-5 py-2 text-[14px] transition-colors disabled:opacity-40 whitespace-nowrap md:px-3 md:py-1 md:text-[11px] ${
                    isDefault
                      ? "bg-white/[0.18] text-text-primary hover:bg-white/[0.24]"
                      : "bg-white/[0.08] text-text-primary hover:bg-white/[0.16]"
                  }`}
                  title={`${p.label}로 분해 시작`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <DirectionChipRow
          currentDirection={topicDirectionId}
          customDirections={customDirections}
          onChangeDirection={setTopicDirectionId}
          addCustomDirection={addCustomDirection}
          removeCustomDirection={removeCustomDirection}
          collapsed={collapsedDir}
          onCollapseChange={setCollapsedDir}
        />

        <FacetLensRow
          currentLens={selectedLens}
          onChangeLens={setSelectedLens}
          collapsed={collapsedLens}
          onCollapseChange={setCollapsedLens}
        />

        <ResultTypeChipRow
          value={topicResultType}
          onChange={setTopicResultType}
          collapsed={collapsedResult}
          onCollapseChange={setCollapsedResult}
        />
      </div>
    </div>
  );
}
