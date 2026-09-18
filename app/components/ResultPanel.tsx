"use client";

import { useEffect, useRef } from "react";
import { useIdea } from "../state/IdeaContext";

export default function ResultPanel() {
  const {
    combinedIdeas,
    combineStatus,
    clearCombined,
    focusedCombinedIdeaId,
    setFocusedCombinedIdeaId,
  } = useIdea();
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!focusedCombinedIdeaId) return;
    const el = itemRefs.current.get(focusedCombinedIdeaId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = setTimeout(() => setFocusedCombinedIdeaId(null), 1600);
    return () => clearTimeout(timer);
  }, [focusedCombinedIdeaId, setFocusedCombinedIdeaId]);

  if (combinedIdeas.length === 0 && combineStatus !== "loading") return null;

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col bg-black">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            조합 결과
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-text-primary">
            {combinedIdeas.length}개
            {combineStatus === "loading" && " · 생성 중..."}
          </div>
        </div>
        {combinedIdeas.length > 0 && (
          <button
            onClick={clearCombined}
            className="text-[11px] text-text-muted hover:text-text-primary"
          >
            초기화
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {combineStatus === "loading" && combinedIdeas.length === 0 && (
          <p className="text-[11px] text-text-muted">아이디어 생성 중...</p>
        )}
        <div className="flex flex-col gap-3">
          {combinedIdeas.map((idea) => (
            <article
              key={idea.id}
              ref={(el) => {
                if (el) itemRefs.current.set(idea.id, el);
                else itemRefs.current.delete(idea.id);
              }}
              className={`rounded-md p-3 transition-colors ${
                focusedCombinedIdeaId === idea.id
                  ? "bg-white/[0.1]"
                  : "bg-white/[0.05]"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-text-muted">
                {idea.chipLabel}
              </div>
              <h3 className="mt-1 text-[14px] font-bold text-text-primary">
                {idea.title}
              </h3>
              <p className="mt-2 text-[11px] leading-5 text-text-secondary">
                {idea.summary}
              </p>
              {idea.mechanism.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {idea.mechanism.map((m, i) => (
                    <li
                      key={i}
                      className="text-[11px] leading-4 text-text-secondary before:mr-2 before:text-text-muted before:content-['•']"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              )}
              {idea.usedPrinciples.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {idea.usedPrinciples.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-text-muted"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
