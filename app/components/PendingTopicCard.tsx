"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useIdea } from "../state/IdeaContext";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import {
  verifyStatusIcon,
  verifyStatusLabel,
  verifyStatusPalette,
} from "@/lib/verify";
import { lensLabel } from "@/lib/lenses";

export default function PendingTopicCard() {
  const {
    pendingTopic,
    cancelPending,
    commitPending,
    topicPurposeId,
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
    principleControllerMode,
    setPrincipleControllerMode,
    principleVerifyLens,
    setPrincipleVerifyLens,
    principleCustomContext,
    setPrincipleCustomContext,
    verifyDerived,
    verifyDerivedStatus,
    runVerifyFacet,
  } = useIdea();
  const [collapsedDir, setCollapsedDir] = useState(false);
  const [collapsedLens, setCollapsedLens] = useState(true);
  const [collapsedResult, setCollapsedResult] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const verifyColRef = useRef<HTMLDivElement>(null);
  const prevGenCountRef = useRef(0);

  if (!pendingTopic) return null;

  const busy = status === "loading";
  // Stable pk so verify state follows the current pending topic string.
  const pk = `주제::${pendingTopic}`;
  const mode = principleControllerMode[pk] ?? "explore";
  const customContext = principleCustomContext[pk] ?? "";
  const vLens = principleVerifyLens[pk] ?? null;
  const vGens = verifyDerived[pk] ?? [];

  // Scroll the verify column into view the first time a new generation
  // appears, mirroring the explore board's horizontal auto-scroll.
  useLayoutEffect(() => {
    const prev = prevGenCountRef.current;
    prevGenCountRef.current = vGens.length;
    if (vGens.length <= prev) return;
    const el = verifyColRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      let scroller: HTMLElement | null = el.parentElement;
      while (scroller) {
        const s = getComputedStyle(scroller);
        if (
          s.overflowX === "auto" ||
          s.overflowX === "scroll" ||
          s.overflow === "auto" ||
          s.overflow === "scroll"
        )
          break;
        scroller = scroller.parentElement;
      }
      if (!scroller) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
        return;
      }
      const wRect = el.getBoundingClientRect();
      const sRect = scroller.getBoundingClientRect();
      const delta = wRect.right - sRect.right + 24;
      scroller.scrollBy({ left: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [vGens.length]);

  return (
    <div className="flex w-max items-start gap-4">
    <div className="decomp-controller flex w-[calc(100vw-3rem)] max-w-full shrink-0 flex-col gap-3 rounded-lg bg-white/[0.05] p-4 md:w-[560px]">
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

      <div className="flex items-center gap-1 self-start rounded-full bg-white/[0.06] p-0.5">
        {(["explore", "verify"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setPrincipleControllerMode(pk, m)}
              className={`rounded-full px-4 py-1 text-[12px] transition-colors md:px-3 md:text-[10px] ${
                active
                  ? "bg-white text-black"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m === "explore" ? "사고확장" : "증명"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          추가 조건 (선택)
        </span>
        <input
          value={customContext}
          onChange={(e) => setPrincipleCustomContext(pk, e.target.value)}
          placeholder="주제를 조율할 추가 조건·관점·제약"
          className="rounded-full bg-white/[0.12] px-4 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[12px]"
        />
      </div>

      {mode === "explore" ? (
        <div className="flex flex-col gap-3 pt-1">
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
          <button
            onClick={() => void commitPending(topicPurposeId)}
            disabled={busy}
            className="mt-2 hidden items-center justify-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black transition-opacity disabled:opacity-30 md:flex"
          >
            <span>분해 시작</span>
            {busy ? <Spinner /> : <Arrow />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <FacetLensRow
            currentLens={vLens}
            onChangeLens={(l) => setPrincipleVerifyLens(pk, l)}
            collapsed={collapsedLens}
            onCollapseChange={setCollapsedLens}
          />
          <button
            onClick={async () => {
              setVerifyBusy(true);
              try {
                await runVerifyFacet("주제", pendingTopic, pendingTopic, vLens);
              } finally {
                setVerifyBusy(false);
              }
            }}
            disabled={verifyBusy}
            className="mt-2 hidden items-center justify-center gap-1.5 self-start rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-black transition-opacity hover:bg-amber-300 disabled:opacity-30 md:flex"
          >
            <span>증명 시작</span>
            {verifyBusy ? <Spinner /> : <Arrow />}
          </button>
        </div>
      )}
    </div>

    {/* Verify results render to the RIGHT of the pending card as a
        separate column, so the user scrolls horizontally to the newly
        produced conditions (mirrors the explore board layout). */}
    {mode === "verify" && vGens.length > 0 && (
      <div
        ref={verifyColRef}
        className="flex w-[calc(100vw-3rem)] max-w-full shrink-0 flex-col gap-3 md:w-[560px]"
      >
        {vGens.map((v) => {
          const st = verifyDerivedStatus[v.key];
          const appendToContext = (addition: string) => {
            const prior = (customContext ?? "").trim();
            const next = prior ? `${prior}\n${addition}` : addition;
            setPrincipleCustomContext(pk, next);
          };
          return (
            <div key={v.key} className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center rounded-full border border-amber-400/70 bg-amber-500/25 px-2.5 py-0.5 text-[10px] font-medium text-amber-100">
                증명 · {lensLabel(v.lens)}
              </span>
              {st === "loading" && (
                <div className="text-[10px] text-text-muted">검증 중…</div>
              )}
              {st === "error" && (
                <div className="text-[10px] text-red-400">검증 실패</div>
              )}
              {v.report.target && (
                <div className="text-[13px] leading-5 text-text-primary md:text-[12px] md:leading-4">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    목표
                  </span>
                  <div className="mt-0.5 font-semibold">
                    {v.report.target}
                  </div>
                </div>
              )}
              {v.report.conditions.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">
                    필수 조건
                  </div>
                  <ul className="mt-1 flex flex-col gap-2">
                    {v.report.conditions.map((c, i) => {
                      const pal = verifyStatusPalette[c.status];
                      return (
                        <li
                          key={`${i}-${c.name}`}
                          className="flex flex-col gap-1.5"
                        >
                          <button
                            onClick={() =>
                              appendToContext(`${c.name}: ${c.principle}`)
                            }
                            title="이 조건을 '추가 조건'에 추가"
                            className={`rounded-md border px-3 py-2 text-left transition-opacity hover:opacity-90 ${pal.border} ${pal.bg}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className={`text-[13px] font-semibold ${pal.text} md:text-[11px]`}
                              >
                                {verifyStatusIcon[c.status]} {c.name}
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${pal.chip}`}
                              >
                                {verifyStatusLabel[c.status]}
                              </span>
                            </div>
                            <div className="mt-1 text-[12px] leading-5 text-text-secondary md:text-[10px] md:leading-4">
                              {c.principle}
                            </div>
                          </button>

                          {c.status === "fail" && c.cascade && (
                            <div className="ml-3 flex flex-col gap-1.5 pl-3">
                              {c.cascade.issue && (
                                <div className="text-[11px] text-rose-200 md:text-[10px]">
                                  <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                    실패 지점 ·{" "}
                                  </span>
                                  {c.cascade.issue}
                                </div>
                              )}
                              {c.cascade.cause && (
                                <div className="text-[11px] leading-5 text-text-secondary md:text-[10px] md:leading-4">
                                  <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                    원인 ·{" "}
                                  </span>
                                  {c.cascade.cause}
                                </div>
                              )}
                              {c.cascade.solutionVariables.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  <div className="text-[9px] uppercase tracking-wider text-text-muted">
                                    해결 변수 — 클릭하여 추가 조건에 반영
                                  </div>
                                  <ul className="flex flex-col gap-1">
                                    {c.cascade.solutionVariables.map((sv) => (
                                      <li key={sv}>
                                        <button
                                          onClick={() => appendToContext(sv)}
                                          className="w-full rounded-md bg-white/[0.06] px-3 py-1.5 text-left text-[12px] text-text-primary hover:bg-white/[0.11] md:text-[11px]"
                                        >
                                          {sv}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5 animate-spin"
      aria-label="진행 중"
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
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
