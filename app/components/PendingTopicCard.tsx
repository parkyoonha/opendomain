"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useIdea, principleKey } from "../state/IdeaContext";
import { FacetNode, CombinedIdeasBoardSection } from "./DecompositionTree";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import ControllerAccordion from "./ControllerAccordion";
import ParentFacetTag from "./ParentFacetTag";
import SessionTimelineModal from "./SessionTimelineModal";
import { kBuiltinDirections } from "@/lib/directions";
import {
  feasibilityLabel,
  feasibilityPalette,
} from "@/lib/verify";
import { lensLabel } from "@/lib/lenses";

export default function PendingTopicCard() {
  const {
    pendingTopic,
    setPendingTopic,
    commitPending,
    addMemo,
    topicPurposeId,
    topicDirectionId,
    setTopicDirectionId,
    topicExpandDirectionId,
    setTopicExpandDirectionId,
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
  // Accordion: only one chip category open at a time; direction opens
  // by default. Per spec, clicking a category header toggles that one
  // and closes the others.
  const [openCategory, setOpenCategory] = useState<
    "direction" | "lens" | "result" | "verify-lens" | null
  >("direction");
  const toggleCategory = (
    cat: "direction" | "lens" | "result" | "verify-lens",
  ) => setOpenCategory((prev) => (prev === cat ? null : cat));
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [topicSubmitting, setTopicSubmitting] = useState(false);
  // 요건 뷰 모드: 세로 리스트(기본) vs 가로 표. 표는 모든 미해결 요건의
  // 해결 버튼을 한 자리에 노출해, 미해결 "하나"가 아니라 전체 공간에서
  // 바로 매트릭스를 열 수 있게 한다.
  const [verifyView, setVerifyView] = useState<"list" | "table">("list");
  const verifyColRef = useRef<HTMLDivElement>(null);
  const prevGenCountRef = useRef(0);
  const combineColRef = useRef<HTMLDivElement>(null);
  const prevCombineCountRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Center the card in the horizontal scroller on first mount. Browser's
  // native scroll-snap doesn't always snap new content on initial render,
  // so we scroll explicitly to avoid the "right-shifted" landing bug.
  useLayoutEffect(() => {
    const el = cardRef.current;
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
      if (!scroller) return;
      const cRect = el.getBoundingClientRect();
      const sRect = scroller.getBoundingClientRect();
      const desiredLeft = sRect.left + (sRect.width - cRect.width) / 2;
      const deltaX = cRect.left - desiredLeft;
      if (Math.abs(deltaX) < 2) return;
      scroller.scrollTo({
        left: scroller.scrollLeft + deltaX,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!pendingTopic) return null;

  const busy = status === "loading";
  // Stable pk so verify state follows the current pending topic string.
  const pk = `주제::${pendingTopic}`;
  const mode = principleControllerMode[pk] ?? "explore";
  const customContext = principleCustomContext[pk] ?? "";
  const vLens = principleVerifyLens[pk] ?? null;
  const vGens = verifyDerived[pk] ?? [];

  // Mode-aware submit: Enter / 우측 arrow button → mirrors the FAB
  // behavior for the pending-topic context (explore / expand / verify).
  const handleTopicSubmit = async () => {
    if (!pendingTopic?.trim() || topicSubmitting) return;
    setTopicSubmitting(true);
    try {
      if (mode === "verify") {
        await runVerifyFacet("주제", pendingTopic, pendingTopic, vLens);
      } else {
        await commitPending(
          topicPurposeId,
          mode === "expand" ? "expand" : "decompose",
        );
      }
    } finally {
      setTopicSubmitting(false);
    }
  };

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
    <div className="mt-6 flex w-max items-start gap-4">
    <div
      ref={cardRef}
      className="decomp-controller flex w-[calc(100vw-1.5rem)] max-w-full shrink-0 snap-center flex-col gap-3 md:w-[560px]"
    >
      {/* 주제 입력 — 초기 InputBar와 동일한 pill 스타일 + 우측 enter 버튼.
          Enter 키 / 버튼 클릭 → 현재 mode(분해/확장/증명)에 맞춰 FAB과
          동일한 액션 트리거. */}
      <div className="flex items-center gap-1 rounded-full bg-white/[0.12] py-3 pl-3 pr-2">
        <input
          value={pendingTopic}
          onChange={(e) => setPendingTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleTopicSubmit();
            }
          }}
          placeholder="주제 입력"
          className="flex-1 bg-transparent px-3 py-2 text-[16px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[14px]"
        />
        <button
          type="button"
          onClick={() => void handleTopicSubmit()}
          disabled={!pendingTopic?.trim() || topicSubmitting}
          aria-label="제출"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 md:h-9 md:w-9 ${
            topicSubmitting ? "bg-white/[0.15] text-white" : "bg-white text-black"
          }`}
        >
          {topicSubmitting ? (
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
      <SessionTimelineModal
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
      />

      {/* 외부 보더 — 탭(인너 보더) + 아코디언 포함. 부모 facet은
          PendingTopicCard에는 없음 (topic 자체가 root). */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
        {/* 분해/확장/증명 탭 — 백컬러 블랙, 아웃라인 보더 없음 */}
        <div className="rounded-xl bg-black p-1.5">
          <div className="flex items-stretch gap-1.5">
            {(["explore", "expand", "verify"] as const).map((m) => {
              const active = mode === m;
              const label =
                m === "explore" ? "분해" : m === "expand" ? "확장" : "증명";
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrincipleControllerMode(pk, m)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-6 py-2 text-center text-[14px] font-medium transition-colors md:px-5 md:py-1.5 md:text-[13px] ${
                    active
                      ? "bg-white text-black"
                      : "text-text-secondary hover:bg-white/[0.08] hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "explore" || mode === "expand" ? (
          <>
            <ControllerAccordion
              label="사고 방향"
              tag={
                [...kBuiltinDirections, ...customDirections].find(
                  (d) =>
                    d.id ===
                    (mode === "expand" ? topicExpandDirectionId : topicDirectionId),
                )?.label ?? (mode === "expand" ? "역사 평행" : "원리")
              }
              open={openCategory === "direction"}
              onToggle={() => toggleCategory("direction")}
            >
              <DirectionChipRow
                axis={mode === "expand" ? "expand" : "decompose"}
                currentDirection={
                  mode === "expand" ? topicExpandDirectionId : topicDirectionId
                }
                customDirections={customDirections}
                onChangeDirection={
                  mode === "expand"
                    ? setTopicExpandDirectionId
                    : setTopicDirectionId
                }
                addCustomDirection={addCustomDirection}
                removeCustomDirection={removeCustomDirection}
                hideLabel
              />
            </ControllerAccordion>
            <ControllerAccordion
              label="렌즈"
              tag={selectedLens ? lensLabel(selectedLens) : "없음"}
              open={openCategory === "lens"}
              onToggle={() => toggleCategory("lens")}
            >
              <FacetLensRow
                currentLens={selectedLens}
                onChangeLens={setSelectedLens}
                hideLabel
              />
            </ControllerAccordion>
            <ControllerAccordion
              label="실행 결과"
              tag={topicResultType ?? "없음"}
              open={openCategory === "result"}
              onToggle={() => toggleCategory("result")}
            >
              <ResultTypeChipRow
                value={topicResultType}
                onChange={setTopicResultType}
                hideLabel
              />
            </ControllerAccordion>
          </>
        ) : (
          <ControllerAccordion
            label="렌즈"
            tag={vLens ? lensLabel(vLens) : "없음"}
            open={openCategory === "verify-lens"}
            onToggle={() => toggleCategory("verify-lens")}
          >
            <FacetLensRow
              currentLens={vLens}
              onChangeLens={(l) => setPrincipleVerifyLens(pk, l)}
              hideLabel
            />
          </ControllerAccordion>
        )}
      </div>
    </div>

    {/* Verify results render to the RIGHT of the pending card as a
        separate column, so the user scrolls horizontally to the newly
        produced conditions (mirrors the explore board layout). */}
    {mode === "verify" && vGens.length > 0 && (
      <div
        ref={verifyColRef}
        className="flex w-[calc(100vw-1.5rem)] max-w-full shrink-0 flex-col gap-3 md:w-[560px]"
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
                const danglingByReq = new Map<string, string>();
                v.report.danglingNeeds.forEach((d) => {
                  // 한 요건에 여러 dangling이 있을 수 있으나 UI에선 첫 하나로
                  // 대표. 매트릭스는 요건 전체를 함께 던지므로 손실 없음.
                  if (!danglingByReq.has(d.requirementId))
                    danglingByReq.set(d.requirementId, d.token);
                });
                const resolveForReq = (
                  r: (typeof v.report.requirements)[number],
                ) => {
                  if (r.feasibility === "infeasible") {
                    const exclude = r.conflictingNeed ?? r.needs[0];
                    if (exclude) openPanelExcluding(exclude, r);
                    else if (r.provides[0])
                      openPanelForOutput(r.provides[0], r.id);
                  } else {
                    const token = danglingByReq.get(r.id);
                    if (token) openPanelForOutput(token, r.id);
                  }
                };
                const canResolveReq = (
                  r: (typeof v.report.requirements)[number],
                ) =>
                  r.feasibility === "infeasible" || danglingByReq.has(r.id);
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-end">
                      <div className="inline-flex overflow-hidden rounded-md border border-white/15 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setVerifyView("list")}
                          className={`px-2 py-0.5 ${
                            verifyView === "list"
                              ? "bg-white/15 text-text-primary"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          리스트
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerifyView("table")}
                          className={`px-2 py-0.5 ${
                            verifyView === "table"
                              ? "bg-white/15 text-text-primary"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          표
                        </button>
                      </div>
                    </div>
                    {verifyView === "list" ? (
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
                    ) : (
                      <div className="overflow-x-auto rounded-md border border-white/[0.08]">
                        <table className="w-full border-collapse text-left text-[11px] md:text-[10px]">
                          <thead>
                            <tr className="bg-white/[0.04] text-[9px] uppercase tracking-wider text-text-muted">
                              <th className="px-2 py-1.5 font-medium">단계</th>
                              <th className="px-2 py-1.5 font-medium">요건</th>
                              <th className="px-2 py-1.5 font-medium">I/O</th>
                              <th className="px-2 py-1.5 font-medium">상태</th>
                              <th className="px-2 py-1.5 font-medium">해결</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderedReqs.map((r) => {
                              const pal = feasibilityPalette[r.feasibility];
                              const rpk = principleKey("주제", r.name);
                              const isExpanded =
                                expandedPrinciples.has(rpk);
                              const expandReq = () => {
                                const sel = {
                                  axis: "주제",
                                  name: r.name,
                                  text: r.description || r.name,
                                };
                                selectPrinciple(sel);
                                markPrincipleExpanded(rpk);
                                void runRecommendChips(
                                  "주제",
                                  r.name,
                                  sel.text,
                                );
                              };
                              const canResolve = canResolveReq(r);
                              return [
                                <tr
                                  key={r.id}
                                  onClick={expandReq}
                                  className="cursor-pointer border-t border-white/[0.06] align-top hover:bg-white/[0.03]"
                                >
                                  <td className="px-2 py-1.5">
                                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-text-primary ring-1 ring-inset ring-white/15">
                                      {r.tier}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div
                                      className={`font-semibold ${pal.text}`}
                                    >
                                      {r.id}. {r.description || r.name}
                                    </div>
                                    {r.description &&
                                      r.name &&
                                      r.description !== r.name && (
                                        <div className="text-[9px] text-text-muted">
                                          ({r.name})
                                        </div>
                                      )}
                                  </td>
                                  <td className="px-2 py-1.5 text-[10px] text-text-muted md:text-[9px]">
                                    {r.needs.length > 0 &&
                                      r.needs.join(" + ")}
                                    {r.needs.length > 0 &&
                                      r.provides.length > 0 &&
                                      " → "}
                                    {r.provides.length > 0 &&
                                      r.provides.join(" + ")}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${pal.chip}`}
                                    >
                                      {feasibilityLabel[r.feasibility]}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {canResolve ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          resolveForReq(r);
                                        }}
                                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black hover:opacity-90"
                                      >
                                        해결
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-text-muted">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>,
                                isExpanded ? (
                                  <tr
                                    key={`${r.id}-x`}
                                    className="border-t border-white/[0.06] bg-white/[0.02]"
                                  >
                                    <td colSpan={5} className="p-2">
                                      <FacetNode
                                        rootAxis="주제"
                                        pathName={r.name}
                                        facetName={`${r.id}. ${r.description || r.name}`}
                                        facetText={
                                          r.rationale ||
                                          (r.needs.length > 0 ||
                                          r.provides.length > 0
                                            ? `${r.needs.join(" + ")}${
                                                r.provides.length
                                                  ? ` → ${r.provides.join(" + ")}`
                                                  : ""
                                              }`
                                            : r.description)
                                        }
                                      />
                                    </td>
                                  </tr>
                                ) : null,
                              ];
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
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
          className="flex w-[calc(100vw-1.5rem)] max-w-full shrink-0 flex-col gap-2 md:w-[560px]"
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
