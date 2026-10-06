"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useIdea, principleKey } from "../state/IdeaContext";
import { FacetNode, CombinedIdeasBoardSection } from "./DecompositionTree";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import {
  feasibilityLabel,
  feasibilityPalette,
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
    selectPrinciple,
    setChipFocusTargetOutput,
    setChipFocusExcludeNeed,
    setChipFocusRequirements,
    setChipPanelOpen,
    runRecommendChips,
    runChipFocusMatrix,
    combinedIdeas,
    combineStatus,
    clearCombined,
    focusedCombinedIdeaId,
    setFocusedCombinedIdeaId,
    expandedPrinciples,
    markPrincipleExpanded,
  } = useIdea();
  const [collapsedDir, setCollapsedDir] = useState(false);
  const [collapsedLens, setCollapsedLens] = useState(true);
  const [collapsedResult, setCollapsedResult] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const verifyColRef = useRef<HTMLDivElement>(null);
  const prevGenCountRef = useRef(0);
  const combineColRef = useRef<HTMLDivElement>(null);
  const prevCombineCountRef = useRef(0);

  if (!pendingTopic) return null;

  const busy = status === "loading";
  // Stable pk so verify state follows the current pending topic string.
  const pk = `주제::${pendingTopic}`;
  const mode = principleControllerMode[pk] ?? "explore";
  const customContext = principleCustomContext[pk] ?? "";
  const vLens = principleVerifyLens[pk] ?? null;
  const vGens = verifyDerived[pk] ?? [];

  const pendingCombines = combinedIdeas.filter(
    (c) => c.topicAxis === "주제",
  );

  // Scroll the combine column into view when a new combine arrives from
  // the chip panel. The panel closes itself after triggering combine, so
  // without this the user lands back on the verify view with no visible
  // sign the combine actually produced results (they'd be off-screen to
  // the right in the horizontal scroller).
  useLayoutEffect(() => {
    const prev = prevCombineCountRef.current;
    prevCombineCountRef.current = pendingCombines.length;
    if (pendingCombines.length <= prev) return;
    const el = combineColRef.current;
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
  }, [pendingCombines.length]);

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
              {(v.report.baselineProduct ||
                v.report.baselineLimitation) && (
                <div className="rounded-md bg-white/[0.04] px-3 py-2 text-[11px] leading-5 md:text-[10px] md:leading-4">
                  {v.report.baselineProduct && (
                    <div className="text-text-secondary">
                      <span className="text-[9px] uppercase tracking-wider text-text-muted">
                        지금의 제품 ·{" "}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {v.report.baselineProduct}
                      </span>
                    </div>
                  )}
                  {v.report.baselineLimitation && (
                    <div className="mt-0.5 text-text-secondary">
                      <span className="text-[9px] uppercase tracking-wider text-rose-200/80">
                        한계 ·{" "}
                      </span>
                      {v.report.baselineLimitation}
                    </div>
                  )}
                </div>
              )}
              {v.report.requirements.length > 0 && (() => {
                const tierOrder: Record<string, number> = {
                  기반: 0,
                  결합: 1,
                  완성: 2,
                };
                const orderedReqs = [...v.report.requirements].sort(
                  (a, b) =>
                    (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9),
                );
                const matrixReqs = v.report.requirements.map((r) => ({
                  id: r.id,
                  name: r.name,
                  needs: r.needs,
                  provides: r.provides,
                }));
                const openPanelForOutput = (
                  token: string,
                  requirementId: string,
                ) => {
                  const owner = v.report.requirements.find(
                    (r) => r.id === requirementId,
                  );
                  const sel = {
                    axis: "주제",
                    name: `${token} 공급원`,
                    text: owner
                      ? `${owner.name} 요건이 필요로 하는 "${token}"의 공급원 (주제: ${pendingTopic})`
                      : `"${token}"의 공급원 (주제: ${pendingTopic})`,
                  };
                  selectPrinciple(sel);
                  setChipFocusTargetOutput(token);
                  setChipFocusExcludeNeed(null);
                  setChipFocusRequirements(matrixReqs);
                  setChipPanelOpen(true);
                  void runChipFocusMatrix(sel.axis, sel.name, sel.text);
                };
                const openPanelExcluding = (
                  excludeToken: string,
                  owner: (typeof v.report.requirements)[number],
                ) => {
                  const targetProvide = owner.provides[0];
                  if (!targetProvide) return;
                  const sel = {
                    axis: "주제",
                    name: `${targetProvide} 공급원 (${excludeToken} 제외)`,
                    text: `${owner.name} 요건을 "${excludeToken}" 없이 구현하는 대안 — ${targetProvide}을(를) 다른 메커니즘으로 (주제: ${pendingTopic})`,
                  };
                  selectPrinciple(sel);
                  setChipFocusTargetOutput(targetProvide);
                  setChipFocusExcludeNeed(excludeToken);
                  setChipFocusRequirements(matrixReqs);
                  setChipPanelOpen(true);
                  void runChipFocusMatrix(sel.axis, sel.name, sel.text);
                };
                const infeasibleReqs = v.report.requirements.filter(
                  (r) => r.feasibility === "infeasible",
                );
                return (
                  <div className="flex flex-col gap-2">
                    <ul className="flex flex-col gap-0.5">
                      {orderedReqs.map((r) => {
                        const pal = feasibilityPalette[r.feasibility];
                        const hasIO =
                          r.needs.length > 0 || r.provides.length > 0;
                        const pk = principleKey("주제", r.name);
                        const isExpanded = expandedPrinciples.has(pk);
                        const expandReq = () => {
                          const sel = {
                            axis: "주제",
                            name: r.name,
                            text: r.description || r.name,
                          };
                          selectPrinciple(sel);
                          markPrincipleExpanded(pk);
                          void runRecommendChips(
                            "주제",
                            r.name,
                            sel.text,
                          );
                        };
                        if (isExpanded) {
                          return (
                            <li key={r.id}>
                              <FacetNode
                                rootAxis="주제"
                                pathName={r.name}
                                facetName={`${r.id}. ${r.description || r.name}`}
                                facetText={
                                  r.rationale ||
                                  (hasIO
                                    ? `${r.needs.join(" + ")}${r.provides.length ? ` → ${r.provides.join(" + ")}` : ""}`
                                    : r.description)
                                }
                              />
                            </li>
                          );
                        }
                        return (
                          <li key={r.id}>
                            <button
                              onClick={expandReq}
                              title="클릭하여 이 요건을 다시 분해"
                              className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-1.5 text-left transition-colors ${pal.bg} hover:brightness-110`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div
                                  className={`text-[13px] md:text-[11px] ${pal.text}`}
                                >
                                  <span className="font-semibold">
                                    {r.id}. {r.description || r.name}
                                  </span>
                                  {r.description &&
                                    r.name &&
                                    r.description !== r.name && (
                                      <span
                                        className={`ml-1 text-[11px] font-normal md:text-[10px] ${
                                          r.feasibility === "infeasible"
                                            ? "text-rose-200/80"
                                            : "text-text-muted"
                                        }`}
                                      >
                                        ({r.name})
                                      </span>
                                    )}
                                </div>
                                <span
                                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${pal.chip}`}
                                >
                                  {feasibilityLabel[r.feasibility]}
                                </span>
                              </div>
                              {hasIO && (
                                <div
                                  className={`text-[10px] leading-4 md:text-[9px] ${
                                    r.feasibility === "infeasible"
                                      ? "text-rose-200/80"
                                      : "text-text-muted"
                                  }`}
                                >
                                  {r.needs.length > 0 && r.needs.join(" + ")}
                                  {r.needs.length > 0 &&
                                    r.provides.length > 0 &&
                                    " → "}
                                  {r.provides.length > 0 &&
                                    r.provides.join(" + ")}
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {(() => {
                      const infeasible = infeasibleReqs[0];
                      const dangling = v.report.danglingNeeds[0];
                      if (!infeasible && !dangling) return null;

                      let subGoal: string;
                      let onResolve: () => void;
                      if (infeasible) {
                        const target = infeasible.provides[0];
                        const exclude =
                          infeasible.conflictingNeed ??
                          infeasible.needs[0] ??
                          undefined;
                        subGoal =
                          infeasible.resolvedGoal ||
                          (exclude && target
                            ? `${exclude} 없이 ${target}을 만드는 방법`
                            : infeasible.name);
                        onResolve = () => {
                          if (exclude) openPanelExcluding(exclude, infeasible);
                          else if (target)
                            openPanelForOutput(target, infeasible.id);
                        };
                      } else {
                        subGoal = `${dangling!.token}을(를) 공급할 메커니즘`;
                        onResolve = () =>
                          openPanelForOutput(
                            dangling!.token,
                            dangling!.requirementId,
                          );
                      }

                      return (
                        <div className="mt-1 flex flex-col gap-2 rounded-md bg-white/[0.16] px-3 py-3">
                          <div className="text-[10px] uppercase tracking-wider text-text-muted">
                            충돌·실패 → 새 목표
                          </div>
                          <div className="text-[14px] font-bold leading-5 text-text-primary md:text-[13px] md:leading-5">
                            {subGoal}
                          </div>
                          <button
                            onClick={onResolve}
                            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-black transition-opacity hover:opacity-90 md:text-[12px]"
                          >
                            해결 → 매트릭스
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    )}

    {/* 조합 결과 — 매트릭스에서 chip을 조합한 뒤 아이디어들이 렌더되는 컬럼.
        CombinedIdeasBoardSection을 재사용해서 explore 보드와 동일한
        칩명 태그 / X 버튼 / FacetNode 사고확장 UX를 그대로 적용. */}
    {mode === "verify" &&
      (pendingCombines.length > 0 || combineStatus === "loading") && (
        <div
          ref={combineColRef}
          className="flex w-[calc(100vw-3rem)] max-w-full shrink-0 flex-col gap-2 md:w-[560px]"
        >
          <CombinedIdeasBoardSection
            combinedIdeas={pendingCombines}
            combineStatus={combineStatus === "loading" ? "loading" : "idle"}
            clearCombined={clearCombined}
            focusedCombinedIdeaId={focusedCombinedIdeaId}
            setFocusedCombinedIdeaId={setFocusedCombinedIdeaId}
            parentAxis="주제"
          />
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
