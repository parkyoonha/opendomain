"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useIdea, principleKey } from "../state/IdeaContext";
import { FacetNode, CombinedIdeasBoardSection } from "./DecompositionTree";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import ControllerAccordion from "./ControllerAccordion";
import ConditionInputBar from "./ConditionInputBar";
import ParentFacetTag from "./ParentFacetTag";
import SessionTimelineModal from "./SessionTimelineModal";
import { kBuiltinDirections } from "@/lib/directions";
import {
  feasibilityLabel,
  feasibilityPalette,
} from "@/lib/verify";
import { lensLabel } from "@/lib/lenses";
import { apiPath } from "@/lib/apiPath";

export default function PendingTopicCard() {
  const {
    pendingTopic,
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
    attachedChips,
    combineStatus,
    runCombine,
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
  // Verify 완료 후 각 요건에 recommend-chips 를 lazy fetch. 첫 번째를
  // (도메인·해결책) 셀 기본값으로 쓰고, 전체 리스트는 사용자가 셀을 눌렀을
  // 때 inline 드롭다운에 노출. 키 = `${genKey}::${reqId}`.
  type AutoRec = {
    domain: string;
    chipText: string;
    reason: string;
    // 도메인 떼어낸 기능 설명 — "제트 도메인이라 안 어울려" 식의 도메인
    // 인접성 기각을 피하기 위해 chip 선택 시 함수 레벨 판단 근거로 노출.
    coreFunction?: string;
    // 실제 쓰이는 산업/제품 — 신뢰 보조 (판단 기준 아님, 작은 캡션으로).
    priorArt?: string;
  };
  const [autoRecs, setAutoRecs] = useState<
    Record<string, AutoRec[] | null>
  >({});
  // 드롭다운 열림 상태 — 요건 블록 단위, "도메인" / "해결책" 두 모드.
  // key = `${genKey}::${reqId}`, value = "domain" | "solution" | 없음(닫힘).
  // B안 구조: 두 pill이 각자 자기 모드로 드롭다운을 연다.
  type DropdownMode = "domain" | "solution";
  const [openDropdowns, setOpenDropdowns] = useState<
    Record<string, DropdownMode | null>
  >({});
  // 사용자가 명시적으로 고른 도메인 필터. 해결책 드롭다운이 이 값으로
  // chip 리스트를 필터링한다. null/undefined이면 전체 chip 노출.
  // 사용자가 chip을 확인하면 primary.domain이 pill display를 덮어쓰지만,
  // 필터 상태는 selectedDomain에 그대로 남는다.
  const [selectedDomain, setSelectedDomain] = useState<
    Record<string, string | null>
  >({});
  // 드롭다운에서 사용자가 "선택"만 한 chip의 식별자(`${domain}::${chipText}`).
  // 클릭 즉시 combine을 돌리지 않고 핵심 함수/priorArt/확인 버튼을 인라인
  // 으로 펼친 뒤, 확인에서 비로소 combine 실행. 필터로 pool이 재구성돼도
  // 식별자가 안정적이도록 index 대신 key 사용.
  const [selectedChipKey, setSelectedChipKey] = useState<
    Record<string, string>
  >({});
  // 중복 fetch 방지용 ref — key = `${genKey}::${reqId}`. 상태(autoRecs) 를
  // 의존성에 넣으면 effect가 자기 자신을 재발화하므로 ref로 추적.
  const autoRecAttempted = useRef<Set<string>>(new Set());
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

  // Lazy 추천 호출 — 사용자가 특정 가지의 드롭다운을 처음 여는 순간에만
  // recommend-chips 1회. verify 완료 시 모든 요건에 eager fetch하면 안
  // 열어볼 가지까지 토큰이 나가므로, 열람 시점에 요청하도록 격하.
  // 요건마다 1번만 (ref로 중복 방지).
  const ensureAutoRecs = (key: string, principleName: string) => {
    if (autoRecAttempted.current.has(key)) return;
    if (!pendingTopic) return;
    autoRecAttempted.current.add(key);
    setAutoRecs((prev) => ({ ...prev, [key]: null }));
    void fetch(apiPath("/api/recommend-chips"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicText: pendingTopic,
        axis: "주제",
        principle: principleName,
        // 5개씩 뽑아야 "도메인 → 해결책" 2단계 필터링에서 각 도메인에
        // 선택지가 5~6개 수준으로 유지됨. 더 올리면 LLM이 억지로 채우며
        // 품질 떨어지고 토큰도 과함.
        perCategory: 5,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          recommendations?: Record<
            string,
            Array<{
              chipText?: string;
              reason?: string;
              coreFunction?: string;
              priorArt?: string;
            }>
          >;
        };
        const recs = data.recommendations ?? {};
        const flat: AutoRec[] = [];
        for (const [cat, arr] of Object.entries(recs)) {
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (item?.chipText) {
              flat.push({
                domain: cat,
                chipText: item.chipText,
                reason: item.reason ?? "",
                coreFunction: item.coreFunction?.trim() || undefined,
                priorArt: item.priorArt?.trim() || undefined,
              });
            }
          }
        }
        if (flat.length > 0) {
          setAutoRecs((prev) => ({ ...prev, [key]: flat }));
        }
      })
      .catch(() => {
        // 조용히 실패 — null 그대로 두고 추천 안 보여줌
      });
  };

  return (
    <div className="mt-6 flex w-max items-start gap-4">
    <div
      ref={cardRef}
      className="decomp-controller flex w-[calc(100vw-1.5rem)] max-w-full shrink-0 snap-center flex-col gap-3 md:w-[560px]"
    >
      {/* 입력바 재구성 — 편집 가능한 주제 텍스트가 아니라 "주제 태그 +
          추가 조건 태그들 + 조건 입력" 조합. 입력창은 추가조건(=
          principleCustomContext) 입력 전용으로 재사용.
          Enter → 조건 추가 (텍스트 있을 때) / Submit 버튼 → 현재 모드
          액션(분해/확장/증명). 조건 태그는 각각 X로 제거. */}
      <ConditionInputBar
        tagText={pendingTopic}
        pk={pk}
        submitting={topicSubmitting}
        disabled={!pendingTopic?.trim()}
        existingContext={customContext}
        setPrincipleCustomContext={setPrincipleCustomContext}
        onSubmit={() => void handleTopicSubmit()}
      />
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
                  <div className="flex flex-col gap-3">
                    {/*
                      요건 블록 리스트. 각 블록:
                        - 가지 제목 (비활성, 클릭 불가)
                        - 도메인·해결책 두 보더 드롭다운 버튼이 가로로
                        - 둘 중 하나 클릭 시 동일한 inline 드롭다운 open
                      라이트 형제 표를 블록으로 세워 재구성한 포맷.
                    */}
                    {orderedReqs.map((r) => {
                      const pal = feasibilityPalette[r.feasibility];
                      const rpk = principleKey("주제", r.name);
                      const dropdownKey = `${v.key}::${r.id}`;
                      const openMode = openDropdowns[dropdownKey] ?? null;
                      const isDomainOpen = openMode === "domain";
                      const isSolutionOpen = openMode === "solution";
                      const isOpen = openMode !== null;
                      const domainFilter = selectedDomain[dropdownKey] ?? null;
                      // 이 요건에 꽂힌 칩: attachedChips 우선, 그다음 매트릭스
                      // 조합 결과(combinedIdeas, topicName이 요건명 또는
                      // "{provides} 공급원"에 걸린 것). chipText로 dedup.
                      const attached = attachedChips[rpk] ?? [];
                      const scopedTopicNames = new Set<string>([
                        r.name,
                        ...r.provides.map((p) => `${p} 공급원`),
                      ]);
                      const relatedCombined = combinedIdeas.filter(
                        (ci) =>
                          ci.topicAxis === "주제" &&
                          !!ci.topicName &&
                          scopedTopicNames.has(ci.topicName),
                      );
                      const seen = new Set<string>();
                      const solutions: Array<{
                        chipText: string;
                        domain?: string;
                      }> = [];
                      for (const a of attached) {
                        if (seen.has(a.chipText)) continue;
                        seen.add(a.chipText);
                        solutions.push({
                          chipText: a.chipText,
                          domain: a.kindOrCategory,
                        });
                      }
                      for (const ci of relatedCombined) {
                        if (seen.has(ci.chipText)) continue;
                        seen.add(ci.chipText);
                        solutions.push({ chipText: ci.chipText });
                      }
                      const primary = solutions[0];
                      const pool = autoRecs[dropdownKey] ?? null;
                      const topRec = pool?.[0] ?? null;
                      // 도메인 리스트 (pool에서 unique 추출, 등장 순서 유지).
                      // B안 도메인 pill 드롭다운이 이 리스트를 보여준다.
                      const uniqueDomains = pool
                        ? Array.from(new Set(pool.map((c) => c.domain)))
                        : [];
                      // 해결책 pill 드롭다운이 노출할 chip 리스트. 사용자가
                      // 도메인 필터를 명시했으면 그 도메인으로만, 아니면 전체.
                      const filteredPool = pool
                        ? domainFilter
                          ? pool.filter((c) => c.domain === domainFilter)
                          : pool
                        : null;
                      // 표시 우선순위 (도메인):
                      //   1. 사용자가 확인한 chip의 도메인 (primary)
                      //   2. 사용자가 명시 선택한 필터 도메인
                      //   3. LLM 1차 추천 (r.recommendedDomain)
                      //   4. recommend-chips 자동 추천 (topRec)
                      const displayDomain =
                        primary?.domain ??
                        domainFilter ??
                        r.recommendedDomain ??
                        topRec?.domain ??
                        null;
                      const domainIsDefault =
                        !primary?.domain &&
                        !domainFilter &&
                        (!!r.recommendedDomain || !!topRec?.domain);
                      const displaySolution =
                        primary?.chipText ??
                        r.recommendedSolution ??
                        topRec?.chipText ??
                        null;
                      const solutionIsDefault =
                        !primary &&
                        (!!r.recommendedSolution || !!topRec?.chipText);
                      const infeasibleWarn =
                        r.feasibility === "infeasible";
                      const danglingWarn = danglingByReq.has(r.id);
                      // 둘 중 하나의 모드로 드롭다운을 토글. 같은 모드 재
                      // 클릭 시 닫히고, 다른 모드 클릭 시 그 모드로 전환.
                      // 어느 쪽을 열든 pool이 공유되므로 양쪽 다 lazy fetch
                      // 트리거.
                      const openAs = (mode: DropdownMode) => {
                        setOpenDropdowns((prev) => {
                          const curr = prev[dropdownKey] ?? null;
                          return {
                            ...prev,
                            [dropdownKey]: curr === mode ? null : mode,
                          };
                        });
                        ensureAutoRecs(dropdownKey, r.name);
                      };
                      // 도메인 리스트에서 하나를 고르면 그 도메인으로 필터
                      // 세팅 + 해결책 모드로 자동 전환 (B안의 2단계 흐름:
                      // "먼저 분야 → 그 안에서").
                      const pickDomain = (domain: string | null) => {
                        setSelectedDomain((prev) => ({
                          ...prev,
                          [dropdownKey]: domain,
                        }));
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [dropdownKey]: "solution",
                        }));
                        // 필터가 바뀌면 이전에 선택된 chip이 보이지 않을
                        // 수 있으므로 선택 초기화.
                        setSelectedChipKey((prev) => {
                          const next = { ...prev };
                          delete next[dropdownKey];
                          return next;
                        });
                      };
                      const confirmChip = async (chip: AutoRec) => {
                        // 요건을 selectedPrinciple로 세팅 → runCombine의
                        // topicFacet이 이 요건을 가리킴 → combinedIdea가
                        // 생성되어 primary로 올라옴.
                        selectPrinciple({
                          axis: "주제",
                          name: r.name,
                          text: r.description || r.name,
                        });
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [dropdownKey]: null,
                        }));
                        setSelectedChipKey((prev) => {
                          const next = { ...prev };
                          delete next[dropdownKey];
                          return next;
                        });
                        try {
                          await runCombine({
                            chipText: chip.chipText,
                            chipCategory: chip.domain,
                            chipReason: chip.reason || undefined,
                          });
                        } catch {
                          // 조용히 실패 — 상태는 그대로
                        }
                      };
                      // 사용자가 어떤 chip을 "선택"만 한 상태 (아직 combine
                      // 실행 전). 식별자는 "${domain}::${chipText}"로, 필터
                      // 변화에 안정적.
                      const chipIdOf = (c: AutoRec) =>
                        `${c.domain}::${c.chipText}`;
                      const selChipId = selectedChipKey[dropdownKey] ?? null;
                      const selectedChip = filteredPool
                        ? (filteredPool.find(
                            (c) => chipIdOf(c) === selChipId,
                          ) ?? null)
                        : null;
                      const pillBase =
                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-left transition-colors";
                      const domainPillClass = (() => {
                        if (primary?.domain)
                          return `${pillBase} border-white/20 bg-white/[0.06] text-text-primary hover:border-white/40`;
                        if (domainIsDefault)
                          return `${pillBase} border-white/15 bg-white/[0.03] italic text-text-muted hover:border-white/30 hover:text-text-primary`;
                        if (infeasibleWarn || danglingWarn)
                          return `${pillBase} border-dashed border-rose-300/60 text-rose-200 hover:border-rose-300`;
                        return `${pillBase} border-dashed border-white/25 text-text-muted hover:border-white/40 hover:text-text-primary`;
                      })();
                      const solutionPillClass = (() => {
                        if (primary)
                          return `${pillBase} border-white/20 bg-white/[0.06] text-text-primary hover:border-white/40`;
                        if (solutionIsDefault)
                          return `${pillBase} border-white/15 bg-white/[0.03] italic text-text-muted hover:border-white/30 hover:text-text-primary`;
                        if (infeasibleWarn || danglingWarn)
                          return `${pillBase} border-dashed border-rose-300/60 text-rose-200 hover:border-rose-300`;
                        return `${pillBase} border-dashed border-white/25 text-text-muted hover:border-white/40 hover:text-text-primary`;
                      })();
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col gap-1.5"
                        >
                          {/* 가지 — 제목, 비활성 */}
                          <div
                            className={`text-[14px] font-semibold md:text-[13px] ${pal.text}`}
                            aria-disabled
                          >
                            {r.name}
                          </div>
                          {/* 도메인 + 해결책 — 각자 보더 가진 드롭다운형
                              버튼. B안: 도메인은 분야 필터 모드, 해결책은
                              필터된 chip 리스트 모드. */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openAs("domain")}
                              className={domainPillClass}
                              aria-expanded={isDomainOpen}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                도메인
                              </span>
                              <span className="text-[13px] md:text-[12px]">
                                {displayDomain ?? "선택"}
                              </span>
                              <span className="text-text-muted">▾</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openAs("solution")}
                              className={solutionPillClass}
                              aria-expanded={isSolutionOpen}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                해결책
                              </span>
                              {(infeasibleWarn || danglingWarn) &&
                                !primary && (
                                  <span className="text-rose-300">
                                    ⚠
                                  </span>
                                )}
                              <span className="text-[13px] md:text-[12px]">
                                {displaySolution ?? "선택"}
                              </span>
                              <span className="text-text-muted">▾</span>
                            </button>
                          </div>
                          {/* 도메인 모드 — pool에서 unique 도메인만 리스트.
                              클릭 시 selectedDomain 세팅 + 해결책 모드로 자동
                              전환. "모두" 옵션으로 필터 해제도 가능. */}
                          {isDomainOpen && (
                            <div className="mt-0.5 flex flex-col gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.04] p-1.5">
                              {pool === null ? (
                                <div className="px-2 py-1.5 text-[11px] text-text-muted">
                                  추천 로딩…
                                </div>
                              ) : uniqueDomains.length === 0 ? (
                                <div className="px-2 py-1.5 text-[11px] text-text-muted">
                                  추천 없음
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => pickDomain(null)}
                                    className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors ${
                                      domainFilter === null
                                        ? "bg-white/[0.1] text-text-primary"
                                        : "text-text-muted hover:bg-white/[0.06]"
                                    }`}
                                  >
                                    <span>모두 보기</span>
                                    <span className="shrink-0 text-[10px] text-text-muted">
                                      {pool.length}개
                                    </span>
                                  </button>
                                  {uniqueDomains.map((d) => {
                                    const count = pool.filter(
                                      (c) => c.domain === d,
                                    ).length;
                                    const isActive = domainFilter === d;
                                    return (
                                      <button
                                        key={`dom-${d}`}
                                        type="button"
                                        onClick={() => pickDomain(d)}
                                        className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors ${
                                          isActive
                                            ? "bg-white/[0.1] text-text-primary"
                                            : "text-text-primary hover:bg-white/[0.06]"
                                        }`}
                                      >
                                        <span className="truncate">{d}</span>
                                        <span className="shrink-0 text-[10px] text-text-muted">
                                          {count}개
                                        </span>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          )}
                          {/* 해결책 모드 — domainFilter로 필터된 chip 리스트.
                              각 chip 클릭 = "선택"만 (combine은 아직). 선택
                              chip 바로 아래에 핵심 함수·priorArt·확인 버튼이
                              펼쳐지고, 확인에서 비로소 조합을 돌린다. */}
                          {isSolutionOpen && (
                            <div className="mt-0.5 flex flex-col gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.04] p-1.5">
                              {domainFilter && (
                                <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-2 pb-1.5 pt-0.5 text-[10px] text-text-muted">
                                  <span>
                                    도메인:{" "}
                                    <span className="text-text-secondary">
                                      {domainFilter}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => pickDomain(null)}
                                    className="rounded text-text-muted hover:text-text-primary"
                                  >
                                    해제 ×
                                  </button>
                                </div>
                              )}
                              {pool === null ? (
                                <div className="px-2 py-1.5 text-[11px] text-text-muted">
                                  추천 로딩…
                                </div>
                              ) : !filteredPool || filteredPool.length === 0 ? (
                                <div className="px-2 py-1.5 text-[11px] text-text-muted">
                                  {domainFilter
                                    ? "이 도메인에 추천 없음"
                                    : "추천 없음"}
                                </div>
                              ) : (
                                filteredPool.map((chip) => {
                                  const chipId = chipIdOf(chip);
                                  const isSelected =
                                    selChipId === chipId &&
                                    selectedChip !== null;
                                  return (
                                    <div
                                      key={chipId}
                                      className="flex flex-col"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedChipKey((prev) =>
                                            prev[dropdownKey] === chipId
                                              ? (() => {
                                                  const next = { ...prev };
                                                  delete next[dropdownKey];
                                                  return next;
                                                })()
                                              : {
                                                  ...prev,
                                                  [dropdownKey]: chipId,
                                                },
                                          )
                                        }
                                        title={chip.reason || undefined}
                                        aria-expanded={isSelected}
                                        className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors ${
                                          isSelected
                                            ? "bg-white/[0.1] text-text-primary"
                                            : "hover:bg-white/[0.06]"
                                        }`}
                                      >
                                        <span className="truncate text-text-primary">
                                          {chip.chipText}
                                        </span>
                                        <span className="shrink-0 text-[10px] text-text-muted">
                                          {chip.domain}
                                        </span>
                                      </button>
                                      {isSelected && (
                                        <div className="mb-1 ml-2 mr-1 mt-1 flex flex-col gap-2 rounded-md border border-white/[0.14] bg-white/[0.05] px-2.5 py-2">
                                          {/* 핵심 함수 — 도메인/맥락 떼어낸
                                              기능 설명. 사용자가 "제트
                                              도메인이라 안 어울려" 식의 도메인
                                              기각을 피하고, 이 함수가 요건의
                                              needs/provides와 매칭되는지로
                                              판단할 수 있게 함. */}
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                              핵심 함수
                                            </span>
                                            <span className="text-[12px] leading-snug text-text-primary">
                                              {chip.coreFunction ||
                                                chip.reason ||
                                                "설명 없음"}
                                            </span>
                                          </div>
                                          {/* 요건 매칭 — 이 chip이 끼워질
                                              자리의 needs/provides 토큰 나열.
                                              LLM이 평가한 매칭 아님(그건
                                              매트릭스 패널에서 함). 여기선
                                              사용자가 핵심 함수와 토큰을 눈
                                              으로 매칭. */}
                                          {(r.needs.length > 0 ||
                                            r.provides.length > 0) && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-[9px] uppercase tracking-wider text-text-muted">
                                                이 요건의 매칭 지점
                                              </span>
                                              <div className="flex flex-wrap gap-1">
                                                {r.needs.map((t) => (
                                                  <span
                                                    key={`need-${t}`}
                                                    className="inline-flex items-center gap-1 rounded border border-white/[0.14] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-text-secondary"
                                                  >
                                                    <span className="text-text-muted">
                                                      ←
                                                    </span>
                                                    {t}
                                                  </span>
                                                ))}
                                                {r.provides.map((t) => (
                                                  <span
                                                    key={`prov-${t}`}
                                                    className="inline-flex items-center gap-1 rounded border border-white/[0.14] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-text-secondary"
                                                  >
                                                    <span className="text-text-muted">
                                                      →
                                                    </span>
                                                    {t}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {/* priorArt — 신뢰 보조. 작게,
                                              판단 기준으로 쓰지 않도록 격하. */}
                                          {chip.priorArt && (
                                            <div className="text-[10px] italic text-text-muted">
                                              쓰이는 곳: {chip.priorArt}
                                            </div>
                                          )}
                                          <div className="flex justify-end">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void confirmChip(chip)
                                              }
                                              className="rounded border border-white/30 bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-text-primary transition-colors hover:bg-white/[0.14]"
                                            >
                                              확인
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

