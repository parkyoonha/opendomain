"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  useIdea,
  principleKey,
  chipKey,
  type CombinedIdeaRecord,
} from "../state/IdeaContext";
import {
  DEFAULT_DIRECTION_ID,
  kBuiltinDirections,
  type ThinkingAxis,
  type ThinkingDirection,
} from "@/lib/directions";
import { lensLabel, type SelectedLens } from "@/lib/lenses";
import type { BigCategory } from "@/lib/constants";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import ControllerAccordion from "./ControllerAccordion";
import ConditionInputBar from "./ConditionInputBar";
import ParentFacetTag from "./ParentFacetTag";
import SessionTimelineModal from "./SessionTimelineModal";
import {
  feasibilityLabel,
  feasibilityPalette,
  type RequirementPart,
  type RequirementEdge,
  type DanglingNeed,
} from "@/lib/verify";
import MemoStack from "./MemoStack";
import PendingTopicCard from "./PendingTopicCard";
import ChipifyCard from "./ChipifyCard";
import MemoFolderList from "./MemoFolderList";

// Shared controller container — layout only. The visible panel background
// moved onto each inner section (추가 조건 / 축 조합 / 사고 방향 / 렌즈 /
// 실행 결과) so the controller reads as a stack of distinct cards rather
// than one giant pill wrapping everything.
const CONTROL_PANEL_CLASSES =
  "decomp-controller relative flex shrink-0 snap-center flex-col gap-3 w-[calc(100vw-1.5rem)] md:w-[560px]";

// Fullscreen journey view for parent-facet 전문 보기. Replaces the old
// small modal: shows the entire ancestor chain (제목·전문·attached chips at
// each level) + the current facet, as a scrollable fullscreen stack.
// Lets the user see the whole context they drilled through, including
// their chip choices at each step.
function FullFacetJourneyView({
  journey,
  onClose,
}: {
  journey: AncestorEntry[];
  onClose: () => void;
}) {
  const { attachedChips, combinedIdeas } = useIdea();
  // 상단 헤더에 노출할 주제 텍스트 — journey의 첫 엔트리가 항상 루트(주제).
  const topicTitle = journey[0]?.shortTitle ?? journey[0]?.title ?? "";
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black">
      {/* pt-safe-8 — 안드로이드/iOS 상단 상태바와 겹치지 않도록
          safe-area-inset-top 만큼 여백 확보. */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-black/95 px-5 pb-4 pt-safe-8 backdrop-blur">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold text-text-primary">
          {topicTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 rounded-full p-1.5 text-text-muted hover:bg-white/[0.08] hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {/* 보더/박스 제거 — "제목 — 내용 전문" + 끝에 적용 칩 태그 inline +
          엔트리 사이 ⋮ 커넥터로만 구성. 전체보기이므로 line-clamp 없이
          전문 노출. */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col px-5 pb-5 pt-3">
          {journey.map((entry, i) => {
            // 이 facet을 "낳은" 소스 칩 찾기:
            //   1순위 — combinedIdeas에서 title 매칭. 조합(runCombine)으로
            //           생성된 facet은 그 때 쓴 chipLabel이 바로 소스 칩.
            //   2순위 — 부모 레벨에서 사용자가 꽂아둔 attachedChips
            //           (분해 프롬프트의 재료).
            const entryName = entry.pk ? entry.pk.split("::")[1] ?? "" : "";
            const sourceIdea = entryName
              ? combinedIdeas.find((c) => c.title === entryName)
              : null;
            const parent = i > 0 ? journey[i - 1] : null;
            const parentAttached = parent?.pk
              ? attachedChips[parent.pk] ?? []
              : [];
            const appliedChips: Array<{ chipText: string; reason?: string }> =
              sourceIdea
                ? [
                    {
                      chipText:
                        sourceIdea.chipLabel ?? sourceIdea.chipText ?? "조합",
                      reason: sourceIdea.chipText,
                    },
                    ...parentAttached,
                  ]
                : parentAttached;
            const isFirst = i === 0;
            const isLast = i === journey.length - 1;
            return (
              <div key={`j-${i}`} className="flex flex-col">
                {i > 0 && (
                  <div
                    aria-hidden
                    className="py-1 pl-1 text-[11px] leading-none text-text-muted"
                  >
                    ⋮
                  </div>
                )}
                {/* 첫 엔트리(주제)는 헤더와 중복되므로 레벨 라벨 생략.
                    "현재" 배지도 제거(요구). */}
                {!isFirst && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-text-muted">
                      {entry.label ?? `레벨 ${i + 1}`}
                    </span>
                  </div>
                )}
                <div className={`${isFirst ? "" : "mt-1"} flex min-w-0 items-start gap-2`}>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`whitespace-pre-wrap break-words text-[13px] leading-5 ${
                        isLast
                          ? "font-semibold text-text-primary"
                          : "font-normal text-text-primary"
                      }`}
                    >
                      {entry.shortTitle ?? entry.title}
                    </div>
                    {entry.fullText && (
                      <div className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-text-secondary">
                        {entry.fullText}
                      </div>
                    )}
                  </div>
                  {appliedChips.length > 0 && (
                    <span className="flex shrink-0 flex-wrap items-center gap-1">
                      {appliedChips.slice(0, 3).map((c, j) => (
                        <span
                          key={`ac-${j}`}
                          className="rounded border border-white/20 px-1.5 py-0 text-[9px] text-text-muted"
                          title={c.reason}
                        >
                          {c.chipText}
                        </span>
                      ))}
                      {appliedChips.length > 3 && (
                        <span className="text-[9px] text-text-muted">
                          +{appliedChips.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type AncestorEntry = {
  // Short title (axis name, segment name, topic). What shows in the stack row.
  // When content is available, this already carries "제목 — 내용..." combined.
  title: string;
  // pk used to look up attached chips for this ancestor level. undefined if
  // chips aren't tracked at this level (e.g., the root topic before commit).
  pk?: string;
  // Pure short title without content — rendered as the heading in the
  // fullscreen journey view.
  shortTitle?: string;
  // Full content/text of this facet (axis principle, sub-facet text, etc.).
  // Rendered as body text in the fullscreen journey view. Undefined for the
  // root topic (title alone is the full text).
  fullText?: string;
  // Level label like "주제" / "축" / "세부 facet" / "현재" for the journey view.
  label?: string;
};

// Stacked parent-facet display. Renders inside the outer tabs/accordion
// border — no own border/background. Shows ONLY the 3 most recent facets;
// older ones not rendered. Top portion has a subtle gradient overlay to
// soften the oldest-of-3. ⋮ connectors sit at the LEFT edge of each row.
function AncestorStack({
  ancestors,
  current,
  onClick,
}: {
  ancestors: AncestorEntry[];
  current: AncestorEntry;
  onClick?: () => void;
}) {
  const { attachedChips } = useIdea();
  const all = [...ancestors, current];
  // Render last 3 but visually show ~2.5 — the top of the oldest fades
  // to transparent via mask-image so only its bottom half peeks through.
  const visible = all.slice(-3);
  // Fade: transparent at 0% → stays transparent until 10% → opaque at 25%.
  // The flat transparent plateau at the top makes the oldest item nearly
  // invisible instead of merely dim.
  const maskStyle: React.CSSProperties = {
    maskImage:
      "linear-gradient(to bottom, transparent 0%, transparent 10%, black 25%)",
    WebkitMaskImage:
      "linear-gradient(to bottom, transparent 0%, transparent 10%, black 25%)",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? "클릭하면 전문 보기" : undefined}
      className="w-full text-left"
    >
      <div className="flex flex-col" style={maskStyle}>
        {visible.flatMap((entry, i) => {
          const chips = entry.pk ? attachedChips[entry.pk] ?? [] : [];
          const titleRow = (
            <div
              key={`t-${i}`}
              className="flex min-w-0 items-start gap-2"
            >
              <span className="line-clamp-1 min-w-0 flex-1 whitespace-pre-wrap break-words text-[12px] font-normal leading-5 text-text-primary">
                {entry.title}
              </span>
              {chips.length > 0 && (
                <span className="flex shrink-0 flex-wrap items-center gap-1">
                  {chips.slice(0, 3).map((c, j) => (
                    <span
                      key={j}
                      className="rounded border border-white/20 px-1.5 py-0 text-[9px] text-text-muted"
                    >
                      {c.chipText}
                    </span>
                  ))}
                  {chips.length > 3 && (
                    <span className="text-[9px] text-text-muted">
                      +{chips.length - 3}
                    </span>
                  )}
                </span>
              )}
            </div>
          );
          // Connector sits BETWEEN items as its own flex child so its top
          // and bottom spacing is symmetric. py-0 + leading-none keeps it
          // tight; the small built-in line-height gives it visual breathing
          // room without creating asymmetric gaps.
          if (i === 0) return [titleRow];
          return [
            <div
              key={`c-${i}`}
              aria-hidden
              className="pl-1 text-[11px] leading-none text-text-muted"
            >
              ⋮
            </div>,
            titleRow,
          ];
        })}
      </div>
    </button>
  );
}

// Per-section panel style — every inner section (chip row, custom-context
// input, action button block) wraps itself in this.
const CONTROL_SECTION_CLASSES =
  "rounded-lg bg-white/[0.05] p-3";

// Random-but-stable border+bg color for the "latest attached chip" tag on
// facet cards. Hashes the chip text so the same chip always gets the same
// color across renders / cards.
const TAG_PALETTE = [
  { border: "border-emerald-400/70", bg: "bg-emerald-500/40", text: "text-emerald-100" },
  { border: "border-rose-400/70", bg: "bg-rose-500/40", text: "text-rose-100" },
  { border: "border-amber-400/70", bg: "bg-amber-500/40", text: "text-amber-100" },
  { border: "border-sky-400/70", bg: "bg-sky-500/40", text: "text-sky-100" },
  { border: "border-violet-400/70", bg: "bg-violet-500/40", text: "text-violet-100" },
  { border: "border-pink-400/70", bg: "bg-pink-500/40", text: "text-pink-100" },
  { border: "border-indigo-400/70", bg: "bg-indigo-500/40", text: "text-indigo-100" },
  { border: "border-teal-400/70", bg: "bg-teal-500/40", text: "text-teal-100" },
  { border: "border-fuchsia-400/70", bg: "bg-fuchsia-500/40", text: "text-fuchsia-100" },
  { border: "border-lime-400/70", bg: "bg-lime-500/40", text: "text-lime-100" },
];

export function chipTagPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

// Inline SVG icons used by the 분해 시작 buttons. Kept as helpers so the
// arrow ↔ spinner swap stays consistent across all four call sites.
function DecomposeArrowIcon() {
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

function DecomposeSpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5 animate-spin"
      aria-label="분해 중"
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

function findScrollAncestor(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    if (
      overflowX === "auto" ||
      overflowX === "scroll" ||
      overflowY === "auto" ||
      overflowY === "scroll"
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

// Compute target scroll position that brings `el` into view within `scroller`.
// Horizontal: aim to center the element in the scroller. For wide
// elements (facets at `calc(100vw-3rem)` on mobile — basically full
// width) centering collapses to left-aligning with a small margin so
// the parent still peeks in; for narrower elements (desktop
// controllers at ~560px) it genuinely centers. The previous fixed
// 18%/8% alignment landed deep sub-facets consistently right of
// center once nesting got past level 3.
// Vertical: element TOP aligns just below viewport top (24px margin)
// so tall controllers show their first section (사고 방향).
function scrollElementIntoView(scroller: HTMLElement, el: HTMLElement) {
  const cRect = el.getBoundingClientRect();
  const sRect = scroller.getBoundingClientRect();
  // Center the element exactly in the viewport. No 5% minimum clamp —
  // that was causing cards nearly as wide as the viewport to appear
  // right-shifted (left margin forced to 5% while right margin stayed
  // whatever was left over).
  const desiredLeft = sRect.left + Math.max(0, (sRect.width - cRect.width) / 2);
  const deltaX = cRect.left - desiredLeft;

  const desiredTop = sRect.top + 24;
  const deltaY = cRect.top - desiredTop;

  if (Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) return;
  scroller.scrollTo({
    left: scroller.scrollLeft + deltaX,
    top: scroller.scrollTop + deltaY,
    behavior: "smooth",
  });
}

type Principle = { axis: string; name: string; text: string };
type Chip = {
  id: string;
  chipText: string;
  chipKind?: "industry" | "psychology" | "object";
  reason?: string;
  kindOrCategory: string;
};

export default function DecompositionTree() {
  const {
    decomposition,
    selectedAxes,
    toggleAxis,
    facetDecompositions,
    facetStatus,
    axisFacetGens,
    removeAxisGen,
    runDecomposeFacet,
    facetDirection,
    setFacetDirection,
    facetLens,
    setFacetLens,
    facetResultType,
    setFacetResultType,
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    selectedPrinciple,
    selectPrinciple,
    runRecommendChips,
    inputMode,
    pendingTopic,
    pages,
    currentPageId,
    chipifyPending,
    centerMode,
    memoListMode,
    multiAxisResults,
    multiAxisStatus,
    multiAxisDirection,
    multiAxisLens,
    multiAxisResultType,
    setMultiAxisDirection,
    setMultiAxisLens,
    setMultiAxisResultType,
    runDecomposeMultiAxis,
    principleDirection,
    principleLens,
    principleResultType,
    principleControllerMode,
    principleVerifyLens,
    runDecomposeSubFacet,
    runVerifyFacet,
    topicPurposeId,
    commitPending,
    selectedLens,
    topicDirectionId,
    topicResultType,
  } = useIdea();

  if (inputMode === "memo") {
    if (memoListMode) {
      return (
        <div className="flex flex-1 flex-col overflow-hidden bg-black">
          <div className="flex-1 overflow-auto px-6 py-6">
            <MemoFolderList />
          </div>
        </div>
      );
    }
    const inMemoPage = pages.some(
      (p) => p.id === currentPageId && p.type === "memo",
    );
    if (!inMemoPage) {
      return (
        <div className="flex h-full items-center justify-center bg-black p-8">
          <p className="text-sm text-text-muted">
            위 입력바에 메모를 기록해보세요
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        {/* pt-12 on mobile leaves just enough room for the top-left
            back button (safe-top-offset + h-10) so the first memo
            sits close to the button without overlapping. Desktop
            keeps the uniform py-6. */}
        <div className="flex-1 overflow-auto px-6 pb-6 pt-12 md:pt-6">
          <MemoStack />
        </div>
      </div>
    );
  }

  if (chipifyPending && centerMode === "chip") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
          <ChipifyCard />
        </div>
      </div>
    );
  }

  if (pendingTopic && !decomposition) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        <div className="flex-1 overflow-auto px-6 py-6">
          <PendingTopicCard />
        </div>
        <MobileDecomposeFab
          multiMode={false}
          controlsExpanded={false}
          selectedPrinciple={null}
          facetDirection={{}}
          facetLens={{}}
          facetResultType={{}}
          principleDirection={{}}
          principleLens={{}}
          principleResultType={{}}
          principleControllerMode={principleControllerMode}
          principleVerifyLens={principleVerifyLens}
          multiAxisDirection={DEFAULT_DIRECTION_ID}
          multiAxisLens={null}
          multiAxisResultType={null}
          pendingTopic={pendingTopic}
          topicPurposeId={topicPurposeId}
          selectedLens={selectedLens}
          topicDirectionId={topicDirectionId}
          topicResultType={topicResultType}
          commitPending={commitPending}
          runDecomposeFacet={runDecomposeFacet}
          runDecomposeSubFacet={runDecomposeSubFacet}
          runDecomposeMultiAxis={runDecomposeMultiAxis}
          runVerifyFacet={runVerifyFacet}
        />
      </div>
    );
  }

  if (!decomposition) {
    // Empty state: no decomposition and no pending topic. We render
    // nothing here — the main layout now centers the InputBar + lens
    // row vertically on mobile, which is both the prompt and the UI.
    return null;
  }

  const axes = Object.entries(decomposition.axisToPrinciple);
  // 다축 결합 모드 보류 — 선택된 축마다 각각의 컨트롤러를 유지해서
  // 두 축을 동시에 탐색 가능하게. (이전: selectedAxes.size >= 2)
  const multiMode = false;
  const axisCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerAxisRef = useCallback(
    (axis: string, el: HTMLDivElement | null) => {
      if (el) axisCardRefs.current.set(axis, el);
      else axisCardRefs.current.delete(axis);
    },
    [],
  );

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const [controlsExpanded, setControlsExpanded] = useState(false);
  const expandControls = useCallback(() => setControlsExpanded(true), []);
  const collapseControls = useCallback(() => setControlsExpanded(false), []);
  // Auto-collapse only when no axis is selected AT ALL (nothing to control).
  useEffect(() => {
    if (selectedAxes.size === 0 && controlsExpanded) setControlsExpanded(false);
  }, [selectedAxes.size, controlsExpanded]);
  // Auto-expand when the first axis is selected so users never have to hunt
  // for an arrow when moving between axes.
  useEffect(() => {
    if (selectedAxes.size > 0 && !controlsExpanded) setControlsExpanded(true);
  }, [selectedAxes.size, controlsExpanded]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-black">
      <header className="px-6 pt-12">
        <h1 className="whitespace-nowrap text-lg font-bold text-text-primary">
          {decomposition.topicText}
        </h1>
      </header>

      {/* pb-[80vh] 확보 — 마지막 축을 선택했을 때도 scrollElementIntoView가
          해당 축의 컨트롤러를 스크롤러 상단에 올려놓을 수 있도록 하단에
          스크롤 여유 공간을 깔아둠. 이 패딩이 없으면 axis 4+ 또는 컨트롤러가
          접혀서 짧아진 경우 scrollTop이 maxScrollTop에 걸려 clamp되고,
          결과적으로 컨트롤러가 상단에 못 붙음. */}
      <div className="flex-1 snap-x snap-mandatory scroll-px-3 overflow-auto px-3 pt-2 pb-[80vh] md:pb-[60vh] md:snap-none">
        {pendingTopic && <PendingTopicCard />}
        <div className="flex w-max items-stretch">
          <AxesColumn
            axes={axes}
            selectedAxes={selectedAxes}
            multiMode={multiMode}
            registerAxisRef={registerAxisRef}
            isMobile={isMobile}
            controlsExpanded={controlsExpanded}
            onExpandControls={expandControls}
            onCollapseControls={collapseControls}
            facetDecompositions={facetDecompositions}
            axisFacetGens={axisFacetGens}
            onRemoveAxisGen={removeAxisGen}
            facetStatus={facetStatus}
            facetDirection={facetDirection}
            facetLens={facetLens}
            facetResultType={facetResultType}
            customDirections={customDirections}
            addCustomDirection={addCustomDirection}
            removeCustomDirection={removeCustomDirection}
            selectedPrinciple={selectedPrinciple}
            selectPrinciple={selectPrinciple}
            toggleAxis={toggleAxis}
            runDecomposeFacet={runDecomposeFacet}
            setFacetDirection={setFacetDirection}
            setFacetLens={setFacetLens}
            setFacetResultType={setFacetResultType}
            runRecommendChips={runRecommendChips}
            selectedLens={selectedLens}
            topicDirectionId={topicDirectionId}
            topicResultType={topicResultType}
          />
          {multiMode && controlsExpanded && (
            <MergedAxisBranch
              axisRefs={axisCardRefs}
              onCollapse={collapseControls}
              selectedAxes={Array.from(selectedAxes)}
              results={multiAxisResults}
              status={multiAxisStatus}
              currentDirection={multiAxisDirection}
              onChangeDirection={setMultiAxisDirection}
              currentLens={multiAxisLens ?? selectedLens}
              onChangeLens={setMultiAxisLens}
              currentResultType={multiAxisResultType}
              onChangeResultType={setMultiAxisResultType}
              customDirections={customDirections}
              addCustomDirection={addCustomDirection}
              removeCustomDirection={removeCustomDirection}
              onDecompose={() =>
                void runDecomposeMultiAxis(
                  multiAxisDirection,
                  multiAxisLens,
                  multiAxisResultType,
                )
              }
            />
          )}
        </div>
      </div>
      <MobileDecomposeFab
        multiMode={multiMode}
        controlsExpanded={controlsExpanded}
        selectedPrinciple={selectedPrinciple}
        facetDirection={facetDirection}
        facetLens={facetLens}
        facetResultType={facetResultType}
        principleDirection={principleDirection}
        principleLens={principleLens}
        principleResultType={principleResultType}
        principleControllerMode={principleControllerMode}
        principleVerifyLens={principleVerifyLens}
        multiAxisDirection={multiAxisDirection}
        multiAxisLens={multiAxisLens}
        multiAxisResultType={multiAxisResultType}
        pendingTopic={pendingTopic}
        topicPurposeId={topicPurposeId}
        selectedLens={selectedLens}
        topicDirectionId={topicDirectionId}
        topicResultType={topicResultType}
        commitPending={commitPending}
        runDecomposeFacet={runDecomposeFacet}
        runDecomposeSubFacet={runDecomposeSubFacet}
        runDecomposeMultiAxis={runDecomposeMultiAxis}
        runVerifyFacet={runVerifyFacet}
      />
    </div>
  );
}

type MobileDecomposeFabProps = {
  multiMode: boolean;
  controlsExpanded: boolean;
  selectedPrinciple: { axis: string; name: string; text: string } | null;
  facetDirection: Record<string, string>;
  facetLens: Record<string, SelectedLens | null>;
  facetResultType: Record<string, BigCategory | null>;
  principleDirection: Record<string, string>;
  principleLens: Record<string, SelectedLens | null>;
  principleResultType: Record<string, BigCategory | null>;
  principleControllerMode: Record<string, "explore" | "expand" | "verify">;
  principleVerifyLens: Record<string, SelectedLens | null>;
  multiAxisDirection: string;
  multiAxisLens: SelectedLens | null;
  multiAxisResultType: BigCategory | null;
  pendingTopic: string | null;
  topicPurposeId: string;
  selectedLens: SelectedLens | null;
  topicDirectionId: string;
  topicResultType: BigCategory | null;
  commitPending: (purposeId: string, axis?: ThinkingAxis) => Promise<void>;
  runDecomposeFacet: (
    axis: string,
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;
  runDecomposeSubFacet: (
    axis: string,
    name: string,
    text: string,
    directionId: string,
    lens: SelectedLens | null,
    resultType: BigCategory | null,
  ) => Promise<void>;
  runDecomposeMultiAxis: (
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;
  runVerifyFacet: (
    axis: string,
    name: string,
    text: string,
    lens: SelectedLens | null,
  ) => Promise<void>;
};

function MobileDecomposeFab({
  multiMode,
  controlsExpanded,
  selectedPrinciple,
  facetDirection,
  facetLens,
  facetResultType,
  principleDirection,
  principleLens,
  principleResultType,
  principleControllerMode,
  principleVerifyLens,
  multiAxisDirection,
  multiAxisLens,
  multiAxisResultType,
  pendingTopic,
  topicPurposeId,
  selectedLens,
  topicDirectionId,
  topicResultType,
  commitPending,
  runDecomposeFacet,
  runDecomposeSubFacet,
  runDecomposeMultiAxis,
  runVerifyFacet,
}: MobileDecomposeFabProps) {
  const {
    setChipPanelOpen,
    principleCustomContext,
    setPrincipleCustomContext,
  } = useIdea();
  const [controllerVisible, setControllerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const visibleSet = new Set<Element>();
    const recomputeVisible = () => {
      // Stale entries (unmounted controllers whose IO leave event we may
      // have missed) would otherwise keep the FAB hidden/visible wrongly
      // after a sub-facet removal. Drop any disconnected nodes before
      // counting so the "button auto-restore" bug (#6) doesn't bite.
      for (const el of Array.from(visibleSet)) {
        if (!document.contains(el)) visibleSet.delete(el);
      }
      setControllerVisible(visibleSet.size > 0);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visibleSet.add(e.target);
          else visibleSet.delete(e.target);
        }
        recomputeVisible();
      },
      { threshold: 0.3 },
    );
    const observed = new WeakSet<Element>();
    const observeAll = () => {
      document.querySelectorAll(".decomp-controller").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        observer.observe(el);
      });
      // Re-check after each DOM mutation in case a controller was removed
      // without IO firing a leave event in time.
      recomputeVisible();
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  const canPending = !!pendingTopic;
  const canMulti = multiMode && controlsExpanded;
  const canPrinciple = !!selectedPrinciple;
  if (!canPending && !canMulti && !canPrinciple) return null;
  if (!controllerVisible) return null;

  // Which pk is "active" for mode detection — pending topic has its own pk
  // keyed on the topic string, principle uses principleKey. Multi-axis is
  // explore-only for now.
  const activePk = canPending && pendingTopic
    ? `주제::${pendingTopic}`
    : canPrinciple && selectedPrinciple
      ? principleKey(selectedPrinciple.axis, selectedPrinciple.name)
      : null;
  const activeMode: "explore" | "expand" | "verify" =
    canMulti ? "explore" : activePk ? principleControllerMode[activePk] ?? "explore" : "explore";

  const handleClick = async () => {
    setLoading(true);
    try {
      // Verify branch: FAB must call runVerifyFacet, not the explore
      // decomposers, otherwise the user sees plain sub-facets instead of
      // the condition-cards format.
      if (activeMode === "verify") {
        if (canPending && pendingTopic) {
          await runVerifyFacet(
            "주제",
            pendingTopic,
            pendingTopic,
            principleVerifyLens[`주제::${pendingTopic}`] ?? null,
          );
          return;
        }
        if (canPrinciple && selectedPrinciple) {
          const { axis, name, text } = selectedPrinciple;
          const pk = principleKey(axis, name);
          await runVerifyFacet(
            axis,
            name,
            text,
            principleVerifyLens[pk] ?? null,
          );
          return;
        }
      }

      if (canPending) {
        await commitPending(
          topicPurposeId,
          activeMode === "expand" ? "expand" : "decompose",
        );
        return;
      }
      if (canMulti) {
        await runDecomposeMultiAxis(
          multiAxisDirection,
          multiAxisLens ?? selectedLens,
          multiAxisResultType,
        );
        return;
      }
      if (!selectedPrinciple) return;
      const { axis, name, text } = selectedPrinciple;
      if (name === "축 전체") {
        await runDecomposeFacet(
          axis,
          facetDirection[axis] ?? topicDirectionId,
          facetLens[axis] ?? selectedLens ?? null,
          facetResultType[axis] ?? topicResultType ?? null,
        );
      } else {
        const pk = principleKey(axis, name);
        await runDecomposeSubFacet(
          axis,
          name,
          text,
          principleDirection[pk] ?? topicDirectionId,
          principleLens[pk] ?? selectedLens ?? null,
          principleResultType[pk] ?? topicResultType ?? null,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const bgClass =
    activeMode === "verify"
      ? "bg-amber-400"
      : activeMode === "expand"
        ? "bg-sky-300"
        : "bg-white";
  const ariaLabel =
    activeMode === "verify"
      ? "증명 시작"
      : activeMode === "expand"
        ? "확장 시작"
        : "분해 시작";

  return (
    <div
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}
      className="mobile-decompose-fab absolute left-1/2 z-30 flex w-[calc(100vw-3rem)] max-w-md -translate-x-1/2 items-center justify-center gap-2"
    >
      {activeMode !== "verify" && (
            <button
              type="button"
              onClick={() => setChipPanelOpen(true)}
              aria-label="칩 조합"
              title="칩 라이브러리 열어 조합"
              className="rounded-full bg-neutral-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg hover:bg-neutral-800"
            >
              + 축 조합
            </button>
          )}
          {/* FAB의 + 입력 버튼은 전부 제거됨 — 조건 입력은 각 컨트롤러 상단의
              ConditionInputBar로 통합됨 (pending / axis / facet 모두 공통). */}
          <button
            onClick={handleClick}
            disabled={loading}
            aria-label={ariaLabel}
            title={ariaLabel}
            className={`flex items-center justify-center rounded-full p-3 text-black shadow-lg ${bgClass}`}
          >
        {loading ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 animate-spin"
            aria-hidden
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
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path
              d="M5 12h14M13 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
          </button>
    </div>
  );
}

type AxesColumnProps = {
  axes: [string, string][];
  selectedAxes: Set<string>;
  multiMode: boolean;
  registerAxisRef: (axis: string, el: HTMLDivElement | null) => void;
  isMobile: boolean;
  controlsExpanded: boolean;
  onExpandControls: () => void;
  onCollapseControls: () => void;
  facetDecompositions: Record<string, Record<string, string>>;
  axisFacetGens: Record<
    string,
    Array<{
      key: string;
      directionId: string;
      lens: SelectedLens | null;
      resultType: BigCategory | null;
      subFacets: Record<string, string>;
    }>
  >;
  onRemoveAxisGen: (axis: string, key: string) => void;
  facetStatus: Record<string, "idle" | "loading" | "error">;
  facetDirection: Record<string, string>;
  facetLens: Record<string, SelectedLens | null>;
  facetResultType: Record<string, BigCategory | null>;
  customDirections: ThinkingDirection[];
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;
  selectedPrinciple: { axis: string; name: string; text: string } | null;
  selectPrinciple: (p: { axis: string; name: string; text: string } | null) => void;
  toggleAxis: (name: string) => void;
  runDecomposeFacet: (
    axis: string,
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => Promise<void>;
  setFacetDirection: (axis: string, directionId: string) => void;
  setFacetLens: (axis: string, lens: SelectedLens | null) => void;
  setFacetResultType: (axis: string, resultType: BigCategory | null) => void;
  runRecommendChips: (axis: string, name: string, text: string) => Promise<void>;
  selectedLens: SelectedLens | null;
  topicDirectionId: string;
  topicResultType: BigCategory | null;
};

function AxesColumn(props: AxesColumnProps) {
  const {
    axes,
    selectedAxes,
    multiMode,
    registerAxisRef,
    isMobile,
    controlsExpanded,
    onExpandControls,
    onCollapseControls,
    facetDecompositions,
    axisFacetGens,
    onRemoveAxisGen,
    facetStatus,
    facetDirection,
    facetLens,
    facetResultType,
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    selectedPrinciple,
    selectPrinciple,
    toggleAxis,
    runDecomposeFacet,
    setFacetDirection,
    setFacetLens,
    setFacetResultType,
    runRecommendChips,
    selectedLens,
    topicDirectionId,
    topicResultType,
  } = props;

  // Find bottom-most selected axis to know where the expand arrow should sit.
  const lastSelectedAxis = (() => {
    for (let i = axes.length - 1; i >= 0; i--) {
      if (selectedAxes.has(axes[i][0])) return axes[i][0];
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-3">
      {axes.map(([axis, principle]) => {
        const active = selectedAxes.has(axis);
        const subFacets = facetDecompositions[axis];
        const fStatus = facetStatus[axis];
        const hideRightSide = multiMode;
        const showControls = active && controlsExpanded;
        const showArrowBelow =
          axis === lastSelectedAxis && !controlsExpanded && selectedAxes.size > 0;

        return (
          <div key={axis} className="flex flex-col gap-2">
            <AxisRow
              axis={axis}
              principle={principle}
              active={active}
              showControls={showControls}
              subFacets={subFacets}
              generations={axisFacetGens[axis]}
              onRemoveGeneration={(key) => onRemoveAxisGen(axis, key)}
              fStatus={fStatus}
              hideRightSide={hideRightSide}
              registerCardRef={registerAxisRef}
              onCollapseControls={onCollapseControls}
              onToggleAxis={() => {
                toggleAxis(axis);
                if (active) {
                  if (selectedPrinciple?.axis === axis) selectPrinciple(null);
                } else {
                  if (!isMobile) onExpandControls();
                  const sel = { axis, name: "축 전체", text: principle };
                  selectPrinciple(sel);
                  void runRecommendChips(sel.axis, sel.name, sel.text);
                }
              }}
              onDecomposeFacet={(directionId, lens, resultType) =>
                void runDecomposeFacet(axis, directionId, lens, resultType)
              }
              currentDirection={facetDirection[axis] ?? topicDirectionId}
              onChangeDirection={(directionId) =>
                setFacetDirection(axis, directionId)
              }
              customDirections={customDirections}
              addCustomDirection={addCustomDirection}
              removeCustomDirection={removeCustomDirection}
              currentLens={facetLens[axis] ?? selectedLens ?? null}
              onChangeLens={(lens) => setFacetLens(axis, lens)}
              currentResultType={
                facetResultType[axis] ?? topicResultType ?? null
              }
              onChangeResultType={(rt) => setFacetResultType(axis, rt)}
            />
            {showArrowBelow && (
              <div className="flex w-[max(24vw,260px)] max-md:w-[calc(100vw-1.5rem)] justify-end px-2 py-3">
                <button
                  onClick={onExpandControls}
                  aria-label="컨트롤러 열기"
                  title="사고 방향/렌즈/실행 결과 열기"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-text-primary hover:bg-white/[0.16]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M5 12h14M13 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type MergedAxisBranchProps = {
  axisRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  selectedAxes: string[];
  results: Record<string, string>;
  status: "idle" | "loading" | "error";
  currentDirection: string;
  onChangeDirection: (id: string) => void;
  currentLens: SelectedLens | null;
  onChangeLens: (lens: SelectedLens | null) => void;
  currentResultType: BigCategory | null;
  onChangeResultType: (rt: BigCategory | null) => void;
  customDirections: ThinkingDirection[];
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;
  onDecompose: () => void;
  onCollapse?: () => void;
};

function MergedAxisBranch({
  axisRefs,
  selectedAxes,
  results,
  status,
  currentDirection,
  onChangeDirection,
  currentLens,
  onChangeLens,
  currentResultType,
  onChangeResultType,
  customDirections,
  addCustomDirection,
  removeCustomDirection,
  onDecompose,
  onCollapse,
}: MergedAxisBranchProps) {
  const [openCategory, setOpenCategory] = useState<
    "direction" | "lens" | "result" | null
  >("direction");
  const toggleCategory = (cat: "direction" | "lens" | "result") =>
    setOpenCategory((prev) => (prev === cat ? null : cat));
  const entries = Object.entries(results);
  const connectorRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const connector = connectorRef.current;
      const control = controlRef.current;
      if (!connector) return;
      const cRect = connector.getBoundingClientRect();
      const endX = cRect.width;
      const endY = control
        ? (control.getBoundingClientRect().top +
            control.getBoundingClientRect().bottom) /
            2 -
          cRect.top
        : cRect.height / 2;
      const newPaths: string[] = [];
      selectedAxes.forEach((axis) => {
        const el = axisRefs.current.get(axis);
        if (!el) return;
        const aRect = el.getBoundingClientRect();
        const startX = 0;
        const startY = (aRect.top + aRect.bottom) / 2 - cRect.top;
        const dx = endX - startX;
        const c1x = startX + dx * 0.55;
        const c2x = endX - dx * 0.55;
        newPaths.push(
          `M ${startX} ${startY} C ${c1x} ${startY} ${c2x} ${endY} ${endX} ${endY}`,
        );
      });
      setPaths(newPaths);
      setDim({ w: cRect.width, h: cRect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (connectorRef.current) ro.observe(connectorRef.current);
    if (controlRef.current) ro.observe(controlRef.current);
    axisRefs.current.forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selectedAxes, axisRefs]);

  // On mount, auto-scroll so merged controls are visible (both axes).
  useLayoutEffect(() => {
    const el = controlRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(el);
      if (!scroller) return;
      scrollElementIntoView(scroller, el);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex items-center self-stretch">
      <div
        ref={connectorRef}
        className="relative h-full shrink-0"
        style={{ width: 48 }}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={dim.w}
          height={dim.h}
          style={{ overflow: "visible" }}
        >
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      <div ref={controlRef} className={CONTROL_PANEL_CLASSES}>
        <div className="text-[10px] uppercase tracking-wider text-text-muted">
          다축 결합 ({selectedAxes.length}개)
        </div>
        <ControllerAccordion
          label="사고 방향"
          tag={
            [...kBuiltinDirections, ...customDirections].find(
              (d) => d.id === currentDirection,
            )?.label ?? "원리"
          }
          open={openCategory === "direction"}
          onToggle={() => toggleCategory("direction")}
        >
          <DirectionChipRow
            currentDirection={currentDirection}
            customDirections={customDirections}
            onChangeDirection={onChangeDirection}
            addCustomDirection={addCustomDirection}
            removeCustomDirection={removeCustomDirection}
            hideLabel
          />
        </ControllerAccordion>
        <ControllerAccordion
          label="렌즈"
          tag={currentLens ? lensLabel(currentLens) : "없음"}
          open={openCategory === "lens"}
          onToggle={() => toggleCategory("lens")}
        >
          <FacetLensRow
            currentLens={currentLens}
            onChangeLens={onChangeLens}
            hideLabel
          />
        </ControllerAccordion>
        <ControllerAccordion
          label="실행 결과"
          tag={currentResultType ?? "없음"}
          open={openCategory === "result"}
          onToggle={() => toggleCategory("result")}
        >
          <ResultTypeChipRow
            value={currentResultType}
            onChange={onChangeResultType}
            hideLabel
          />
        </ControllerAccordion>
        {/* Inline 분해 시작 removed — fixed bottom-center FAB owns the
            submit action across all breakpoints. */}
        {status === "error" && (
          <span className="text-[10px] text-red-400">분해 실패</span>
        )}
      </div>

      {entries.length > 0 && (
        <div className="ml-4 flex shrink-0 flex-col gap-1">
          {entries.map(([name, text]) => (
            <div
              key={name}
              className="w-[max(15vw,180px)] rounded-md bg-white/[0.06] px-3 py-2 max-md:w-[calc(100vw-3rem)]"
            >
              <div className="text-[11px] font-semibold text-text-primary">
                {name}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-text-secondary">
                {text}
              </div>
            </div>
          ))}
        </div>
      )}
      <div aria-hidden className="shrink-0" style={{ width: "800px" }} />
    </div>
  );
}

type AxisRowProps = {
  axis: string;
  principle: string;
  active: boolean;
  showControls?: boolean;
  subFacets: Record<string, string> | undefined;
  generations?: Array<{
    key: string;
    directionId: string;
    lens: SelectedLens | null;
    resultType: BigCategory | null;
    subFacets: Record<string, string>;
  }>;
  onRemoveGeneration?: (key: string) => void;
  fStatus: "idle" | "loading" | "error" | undefined;
  hideRightSide?: boolean;
  registerCardRef?: (axis: string, el: HTMLDivElement | null) => void;
  onToggleAxis: () => void;
  onCollapseControls?: () => void;
  onDecomposeFacet: (
    directionId?: string,
    lens?: SelectedLens | null,
    resultType?: BigCategory | null,
  ) => void;
  currentDirection: string;
  onChangeDirection: (id: string) => void;
  customDirections: ThinkingDirection[];
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;
  currentLens: SelectedLens | null;
  onChangeLens: (lens: SelectedLens | null) => void;
  currentResultType: BigCategory | null;
  onChangeResultType: (rt: BigCategory | null) => void;
};

function AxisRow({
  axis,
  principle,
  active,
  showControls: showControlsProp = false,
  subFacets,
  generations,
  onRemoveGeneration,
  fStatus,
  hideRightSide = false,
  registerCardRef,
  onToggleAxis,
  onCollapseControls,
  onDecomposeFacet,
  currentDirection,
  onChangeDirection,
  customDirections,
  addCustomDirection,
  removeCustomDirection,
  currentLens,
  onChangeLens,
  currentResultType,
  onChangeResultType,
}: AxisRowProps) {
  const subEntries = subFacets ? Object.entries(subFacets) : [];
  // Accordion state for the chip categories; only one open at a time,
  // 사고 방향 opens by default.
  const [openCategory, setOpenCategory] = useState<
    "direction" | "lens" | "result" | "verify-lens" | null
  >("direction");
  const toggleCategory = (
    cat: "direction" | "lens" | "result" | "verify-lens",
  ) => setOpenCategory((prev) => (prev === cat ? null : cat));
  const {
    addMemo,
    setChipPanelOpen,
    attachedChips,
    combinedIdeas,
    combineStatus,
    clearCombined,
    focusedCombinedIdeaId,
    setFocusedCombinedIdeaId,
    selectedPrinciple,
    principleControllerMode,
    setPrincipleControllerMode,
    principleVerifyLens,
    setPrincipleVerifyLens,
    principleCustomContext,
    setPrincipleCustomContext,
    verifyDerived,
    verifyDerivedStatus,
    runVerifyFacet,
    decomposition,
  } = useIdea();
  const axisPk = principleKey(axis, "축 전체");
  const axisMode = principleControllerMode[axisPk] ?? "explore";
  const axisCustomContext = principleCustomContext[axisPk] ?? "";
  const axisVerifyLens = principleVerifyLens[axisPk] ?? null;
  const [showFullFacet, setShowFullFacet] = useState(false);
  const fullFacetText = `${axis} — ${principle}`;
  // Ancestor + current rendered as "제목 — 내용..." one-liners (line-clamp-1).
  // Each entry also carries shortTitle/fullText/label for the fullscreen
  // journey view.
  const ancestorEntries: AncestorEntry[] = decomposition?.topicText
    ? [
        {
          title: decomposition.topicText,
          shortTitle: decomposition.topicText,
          pk: `주제::${decomposition.topicText}`,
          label: "주제",
        },
      ]
    : [];
  const currentEntry: AncestorEntry = {
    title: fullFacetText,
    shortTitle: axis,
    fullText: principle,
    pk: axisPk,
    label: "축",
  };
  const journeyEntries: AncestorEntry[] = [...ancestorEntries, currentEntry];
  const axisVerifyGens = verifyDerived[axisPk] ?? [];
  const [axisVerifyLoading, setAxisVerifyLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const generationsRef = useRef<HTMLDivElement>(null);
  const showControls = showControlsProp && active && !hideRightSide;
  const axisChips = attachedChips[principleKey(axis, "축 전체")] ?? [];
  const latestAxisChip = axisChips[axisChips.length - 1];
  const genCount = generations?.length ?? 0;
  const prevGenCountRef = useRef(0);
  const axisCombinedIdeas = useMemo(
    () =>
      combinedIdeas.filter(
        (c) => c.topicAxis === axis && c.topicName === "축 전체",
      ),
    [combinedIdeas, axis],
  );
  const isAxisSelected =
    selectedPrinciple?.axis === axis && selectedPrinciple?.name === "축 전체";
  const showAxisCombineLoading =
    isAxisSelected &&
    combineStatus === "loading" &&
    axisCombinedIdeas.length === 0;

  // When a new generation appears, scroll to bring the LATEST generation
  // (last child of the generations container) into view — same motion as first
  // decomposition (horizontal + vertical).
  useLayoutEffect(() => {
    const prev = prevGenCountRef.current;
    prevGenCountRef.current = genCount;
    if (genCount <= prev) return;
    const container = generationsRef.current;
    if (!container) return;
    const lastGen = container.lastElementChild as HTMLElement | null;
    if (!lastGen) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(lastGen);
      if (!scroller) return;
      scrollElementIntoView(scroller, lastGen);
    });
    return () => cancelAnimationFrame(raf);
  }, [genCount]);

  // Auto-scroll so controls come into view once expanded.
  useLayoutEffect(() => {
    if (!showControls) return;
    const el = controlsRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(el);
      if (!scroller) return;
      scrollElementIntoView(scroller, el);
    });
    return () => cancelAnimationFrame(raf);
  }, [showControls]);

  return (
    <div className="flex items-start gap-3">
      <div
        ref={(el) => registerCardRef?.(axis, el)}
        className="group relative w-[max(24vw,260px)] max-md:w-[calc(100vw-1.5rem)] shrink-0 snap-center"
      >
        <button
          onClick={onToggleAxis}
          className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
            active
              ? "bg-white/[0.14]"
              : "bg-white/[0.08] hover:bg-white/[0.11]"
          }`}
        >
          <div className="text-[15px] font-semibold text-text-primary md:text-[12px]">
            {axis}
          </div>
          <div className="mt-1 text-[13px] leading-5 text-text-secondary md:text-[11px] md:leading-4">
            {principle}
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addMemo(`${axis} — ${principle}`);
          }}
          title="이 축을 메모로 보내기"
          className="absolute right-1 top-1 rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-text-secondary opacity-0 transition-opacity hover:bg-white/[0.18] hover:text-text-primary group-hover:opacity-100 focus:opacity-100"
        >
          → 메모
        </button>
      </div>

      {showControls && (
        <div ref={controlsRef} className={CONTROL_PANEL_CLASSES}>
          {/* 공통 입력바 — PendingTopicCard와 동일한 "태그 + 조건 + 제출"
              패턴. 축 자체를 태그로 보여주고, 조건은 principleCustomContext
              [axisPk]에 쌓임. 제출은 현재 모드(분해/확장/증명) 액션. */}
          <ConditionInputBar
            tagText={axis}
            pk={axisPk}
            existingContext={axisCustomContext}
            setPrincipleCustomContext={setPrincipleCustomContext}
            onSubmit={() => {
              if (axisMode === "verify") {
                void runVerifyFacet(axis, "축 전체", principle, axisVerifyLens);
              } else {
                void onDecomposeFacet(
                  currentDirection,
                  currentLens,
                  currentResultType,
                );
              }
            }}
          />
          {/* 외부 보더 — 부모 facet 구간 + 탭(내부 보더) + 아코디언 전부를
              한 박스에 묶음. 아코디언 열림/닫힘 시 박스 전체 높이가 바뀌어
              축 하단 공백도 함께 조절되고, 부모 facet 구간도 그 공백에
              포함됨. */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
            {/* 부모 facet 스택 — 보더 안 상단 */}
            <AncestorStack
              ancestors={ancestorEntries}
              current={currentEntry}
              onClick={() => setShowFullFacet(true)}
            />
            {/* 분해/확장/증명 탭 — 백컬러 블랙, 아웃라인 보더 없음 */}
            <div className="rounded-xl bg-black p-1.5">
              <div className="flex items-stretch gap-1.5">
                {(["explore", "expand", "verify"] as const).map((m) => {
                  const active = axisMode === m;
                const label =
                  m === "explore" ? "분해" : m === "expand" ? "확장" : "증명";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPrincipleControllerMode(axisPk, m)}
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

            {axisMode === "explore" || axisMode === "expand" ? (
              <>
                <ControllerAccordion
                  label="사고 방향"
                  tag={
                    [...kBuiltinDirections, ...customDirections].find(
                      (d) => d.id === currentDirection,
                    )?.label ?? (axisMode === "expand" ? "역사 평행" : "원리")
                  }
                  open={openCategory === "direction"}
                  onToggle={() => toggleCategory("direction")}
                >
                  <DirectionChipRow
                    axis={axisMode === "expand" ? "expand" : "decompose"}
                    currentDirection={currentDirection}
                    customDirections={customDirections}
                    onChangeDirection={onChangeDirection}
                    addCustomDirection={addCustomDirection}
                    removeCustomDirection={removeCustomDirection}
                    hideLabel
                  />
                </ControllerAccordion>
                <ControllerAccordion
                  label="렌즈"
                  tag={currentLens ? lensLabel(currentLens) : "없음"}
                  open={openCategory === "lens"}
                  onToggle={() => toggleCategory("lens")}
                >
                  <FacetLensRow
                    currentLens={currentLens}
                    onChangeLens={onChangeLens}
                    hideLabel
                  />
                </ControllerAccordion>
                <ControllerAccordion
                  label="실행 결과"
                  tag={currentResultType ?? "없음"}
                  open={openCategory === "result"}
                  onToggle={() => toggleCategory("result")}
                >
                  <ResultTypeChipRow
                    value={currentResultType}
                    onChange={onChangeResultType}
                    hideLabel
                  />
                </ControllerAccordion>
              </>
            ) : (
              <ControllerAccordion
                label="렌즈"
                tag={axisVerifyLens ? lensLabel(axisVerifyLens) : "없음"}
                open={openCategory === "verify-lens"}
                onToggle={() => toggleCategory("verify-lens")}
              >
                <FacetLensRow
                  currentLens={axisVerifyLens}
                  onChangeLens={(lens) => setPrincipleVerifyLens(axisPk, lens)}
                  hideLabel
                />
              </ControllerAccordion>
            )}
          </div>
          <SessionTimelineModal
            open={timelineOpen}
            onClose={() => setTimelineOpen(false)}
          />
          {showFullFacet && (
            <FullFacetJourneyView
              journey={journeyEntries}
              onClose={() => setShowFullFacet(false)}
            />
          )}
        </div>
      )}

      {showControls && generations && generations.length > 0 && (
        <div
          ref={generationsRef}
          className="flex shrink-0 snap-center flex-col gap-4 md:pl-4"
        >
          {generations.map((g) => {
            const dirLabel =
              kBuiltinDirections.find((d) => d.id === g.directionId)?.label ??
              customDirections.find((d) => d.id === g.directionId)?.label ??
              g.directionId;
            const rtLabel = g.resultType ?? "결과 없음";
            const genEntries = Object.entries(g.subFacets);
            const pal = chipTagPalette(g.key);
            return (
              <div key={g.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 md:pl-8">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${pal.border} ${pal.bg} ${pal.text}`}
                  >
                    {dirLabel} · {lensLabel(g.lens)} · {rtLabel}
                  </span>
                  {onRemoveGeneration && (
                    <button
                      onClick={() => onRemoveGeneration(g.key)}
                      title="이 생성 삭제"
                      aria-label="생성 삭제"
                      className={`rounded-full border px-1.5 text-[10px] hover:brightness-125 ${pal.border} ${pal.bg} ${pal.text}`}
                    >
                      ×
                    </button>
                  )}
                </div>
                <SubFacets axis={axis} entries={genEntries} />
              </div>
            );
          })}
        </div>
      )}
      {showControls && axisVerifyGens.length > 0 && (
        <div className="flex shrink-0 snap-center flex-col gap-4 md:pl-4">
          {axisVerifyGens.map((v) => {
            const st = verifyDerivedStatus[v.key];
            return (
              <VerifyReportCard
                key={v.key}
                lens={v.lens}
                report={v.report}
                status={st}
                parentAxis={axis}
              />
            );
          })}
        </div>
      )}
      {showControls &&
        (axisCombinedIdeas.length > 0 || showAxisCombineLoading) && (
          <CombinedIdeasBoardSection
            combinedIdeas={axisCombinedIdeas}
            combineStatus={showAxisCombineLoading ? "loading" : "idle"}
            clearCombined={clearCombined}
            focusedCombinedIdeaId={focusedCombinedIdeaId}
            setFocusedCombinedIdeaId={setFocusedCombinedIdeaId}
            parentAxis={axis}
          />
        )}
      {!hideRightSide && (
        <div aria-hidden className="shrink-0" style={{ width: "800px" }} />
      )}
    </div>
  );
}

type SubFacetsProps = {
  axis: string;
  entries: [string, string][];
};

function SubFacets({
  axis,
  entries,
}: SubFacetsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (entries.length === 0) return;
    const raf = requestAnimationFrame(() => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      let scroller: HTMLElement | null = wrap.parentElement;
      while (scroller) {
        const style = getComputedStyle(scroller);
        if (style.overflowX === "auto" || style.overflowX === "scroll") break;
        scroller = scroller.parentElement;
      }
      if (!scroller) return;
      const wRect = wrap.getBoundingClientRect();
      const sRect = scroller.getBoundingClientRect();
      // center the principles group in the viewport
      const targetLeft = sRect.left + (sRect.width - wRect.width) / 2;
      const delta = wRect.left - targetLeft;
      scroller.scrollBy({ left: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis]);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const wRect = wrap.getBoundingClientRect();
      const parent = wrap.parentElement;
      if (!parent) return;
      const varBtn = parent.querySelector<HTMLButtonElement>(":scope > button");
      if (!varBtn) return;
      const vRect = varBtn.getBoundingClientRect();

      const startX = 0;
      const startY = (vRect.top + vRect.bottom) / 2 - wRect.top;

      const newPaths: string[] = [];
      entries.forEach(([name]) => {
        const el = itemRefs.current.get(name);
        if (!el) return;
        // measure the principle BUTTON, not the li (li grows when chips attach)
        const btn = el.querySelector<HTMLButtonElement>(":scope > button");
        if (!btn) return;
        const pRect = btn.getBoundingClientRect();
        const endX = pRect.left - wRect.left;
        const endY = (pRect.top + pRect.bottom) / 2 - wRect.top;
        const dx = endX - startX;
        const c1x = startX + dx * 0.55;
        const c2x = endX - dx * 0.55;
        newPaths.push(
          `M ${startX} ${startY} C ${c1x} ${startY} ${c2x} ${endY} ${endX} ${endY}`,
        );
      });
      setPaths(newPaths);
      setDim({ w: wRect.width, h: wRect.height });
    };
    measure();

    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    const parent = wrapperRef.current?.parentElement;
    if (parent) ro.observe(parent);
    itemRefs.current.forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [entries]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-start md:pl-8"
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        width={dim.w}
        height={dim.h}
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <ul className="flex flex-col gap-1">
        {entries.map(([name, text]) => {
          return (
            <li
              key={name}
              ref={(el) => {
                if (el) itemRefs.current.set(name, el);
                else itemRefs.current.delete(name);
              }}
              className="flex items-start"
            >
              <FacetNode
                rootAxis={axis}
                pathName={name}
                facetName={name}
                facetText={text}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Card = {
  key: string;
  chip: Chip;
  facetName: string | null;
  facetText: string | null;
};

function AttachedChipsRow({
  chips,
  parentAxis,
  parentPrincipleName,
  parentPrincipleText,
  onRemove,
}: {
  chips: Chip[];
  parentAxis: string;
  parentPrincipleName: string;
  parentPrincipleText: string;
  onRemove: (id: string) => void;
}) {
  const { chipDecompositions, chipDecompStatus, runCombine, combineStatus } =
    useIdea();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const combineBtnRef = useRef<HTMLButtonElement>(null);

  const cards: Card[] = useMemo(
    () =>
      chips.flatMap<Card>((c) => {
        if (c.chipKind) {
          const ck = chipKey(c.chipKind, c.chipText);
          const decomp = chipDecompositions[ck];
          if (decomp && Object.keys(decomp).length > 0) {
            return Object.entries(decomp).map<Card>(([axis, principle]) => ({
              key: `${c.id}::${axis}`,
              chip: c,
              facetName: axis,
              facetText: principle,
            }));
          }
        }
        return [
          { key: c.id, chip: c, facetName: null, facetText: c.reason ?? null },
        ];
      }),
    [chips, chipDecompositions],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const wRect = wrap.getBoundingClientRect();
      const parent = wrap.parentElement;
      if (!parent) return;
      const principleBtn =
        parent.querySelector<HTMLButtonElement>(":scope > button");
      if (!principleBtn) return;
      const pRect = principleBtn.getBoundingClientRect();

      const startX = 0;
      const startY = (pRect.top + pRect.bottom) / 2 - wRect.top;

      const newPaths: string[] = [];
      cards.forEach((card) => {
        const el = itemRefs.current.get(card.key);
        if (!el) return;
        const cRect = el.getBoundingClientRect();
        const endX = cRect.left - wRect.left;
        const endY = (cRect.top + cRect.bottom) / 2 - wRect.top;
        const dx = endX - startX;
        const c1x = startX + dx * 0.55;
        const c2x = endX - dx * 0.55;
        newPaths.push(
          `M ${startX} ${startY} C ${c1x} ${startY} ${c2x} ${endY} ${endX} ${endY}`,
        );
      });
      setPaths(newPaths);
      setDim({ w: wRect.width, h: wRect.height });
    };
    measure();

    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    const parent = wrapperRef.current?.parentElement;
    if (parent) ro.observe(parent);
    itemRefs.current.forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [cards]);

  const toggleSelect = (key: string) => {
    setSelectedKey((cur) => (cur === key ? null : key));
  };

  useLayoutEffect(() => {
    if (!selectedKey) return;
    const raf = requestAnimationFrame(() => {
      const btn = combineBtnRef.current;
      if (!btn) return;
      let scroller: HTMLElement | null = btn.parentElement;
      while (scroller) {
        const style = getComputedStyle(scroller);
        if (style.overflowX === "auto" || style.overflowX === "scroll") break;
        scroller = scroller.parentElement;
      }
      if (!scroller) {
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        return;
      }
      const bRect = btn.getBoundingClientRect();
      const sRect = scroller.getBoundingClientRect();
      // Position button 25% from left of the scroll viewport — 75% empty board to the right
      const desiredLeft = sRect.left + sRect.width * 0.25;
      const delta = bRect.left - desiredLeft;
      scroller.scrollBy({ left: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedKey]);

  const combineSelected = () => {
    const card = cards.find((c) => c.key === selectedKey);
    if (!card) return;
    void runCombine({
      chipKind: card.chip.chipKind ?? null,
      chipCategory: card.chip.chipKind ? null : card.chip.kindOrCategory,
      chipText: card.chip.chipText,
      chipReason: card.chip.reason ?? null,
      chipFacet: card.facetName
        ? { axis: card.facetName, principle: card.facetText ?? "" }
        : null,
      topicFacet: { axis: parentAxis, principle: parentPrincipleText },
    });
  };

  return (
    <div ref={wrapperRef} className="relative flex items-start md:pl-8">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        width={dim.w}
        height={dim.h}
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="flex flex-col gap-1">
        {cards.map((card) => {
          const isSel = selectedKey === card.key;
          const isFirstOfChip =
            card.facetName === null ||
            card === cards.find((x) => x.chip.id === card.chip.id);
          const isLoading =
            card.facetName === null &&
            card.chip.chipKind &&
            chipDecompStatus[chipKey(card.chip.chipKind, card.chip.chipText)] ===
              "loading";
          return (
            <div key={card.key} className="flex items-center gap-2">
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(card.key, el);
                else itemRefs.current.delete(card.key);
              }}
              className={`w-[max(15vw,180px)] max-md:w-[calc(100vw-3rem)] rounded-md px-3 py-2 transition-colors ${
                isSel
                  ? "bg-white text-black"
                  : "bg-white/[0.06] hover:bg-white/[0.14]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => toggleSelect(card.key)}
                  className="min-w-0 flex-1 text-left"
                >
                  {isFirstOfChip && (
                    <div
                      className={`text-[10px] uppercase tracking-wider ${
                        isSel ? "text-black/60" : "text-text-muted"
                      }`}
                    >
                      {card.chip.kindOrCategory} · {card.chip.chipText}
                    </div>
                  )}
                  {card.facetName ? (
                    <>
                      <div
                        className={`mt-0.5 text-[11px] font-semibold ${
                          isSel ? "text-black" : "text-text-primary"
                        }`}
                      >
                        {card.facetName}
                      </div>
                      {card.facetText && (
                        <div
                          className={`mt-1 text-[10px] leading-4 ${
                            isSel ? "text-black/70" : "text-text-secondary"
                          }`}
                        >
                          {card.facetText}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!isFirstOfChip && (
                        <div className="text-[11px] font-semibold text-text-primary">
                          {card.chip.chipText}
                        </div>
                      )}
                      {card.facetText && (
                        <div
                          className={`mt-1 text-[10px] leading-4 ${
                            isSel ? "text-black/70" : "text-text-secondary"
                          }`}
                        >
                          {card.facetText}
                        </div>
                      )}
                      {isLoading && (
                        <div
                          className={`mt-1 text-[10px] ${
                            isSel ? "text-black/60" : "text-text-muted"
                          }`}
                        >
                          분해 중...
                        </div>
                      )}
                    </>
                  )}
                </button>
                {isFirstOfChip && (
                  <button
                    onClick={() => onRemove(card.chip.id)}
                    aria-label="칩 제거"
                    className={`shrink-0 ${
                      isSel
                        ? "text-black/60 hover:text-black"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                      <path
                        d="M6 6l12 12M6 18L18 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {isSel && (
              <button
                ref={combineBtnRef}
                onClick={combineSelected}
                disabled={combineStatus === "loading"}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black transition-opacity disabled:opacity-40"
              >
                <span>조합</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FacetNode({
  rootAxis,
  pathName,
  facetName,
  facetText,
}: {
  rootAxis: string;
  pathName: string;
  facetName: string;
  facetText: string;
}) {
  const {
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    subFacetDerived,
    subFacetDerivedStatus,
    runDecomposeSubFacet,
    principleDirection,
    principleLens,
    principleResultType,
    setPrincipleDirection,
    setPrincipleLens,
    setPrincipleResultType,
    selectedPrinciple,
    selectPrinciple,
    runRecommendChips,
    attachedChips,
    removeAttachedChip,
    addMemo,
    setChipPanelOpen,
    expandedPrinciples,
    markPrincipleExpanded,
    markPrincipleCollapsed,
    blockerPrinciples,
    toggleBlockerPrinciple,
    principleControllerMode,
    setPrincipleControllerMode,
    principleVerifyLens,
    setPrincipleVerifyLens,
    principleCustomContext,
    setPrincipleCustomContext,
    verifyDerived,
    verifyDerivedStatus,
    runVerifyFacet,
    selectedLens,
    topicDirectionId,
    topicResultType,
    combinedIdeas,
    combineStatus,
    clearCombined,
    focusedCombinedIdeaId,
    setFocusedCombinedIdeaId,
    decomposition,
    facetDecompositions,
  } = useIdea();

  const pk = principleKey(rootAxis, pathName);
  const isBlocker = blockerPrinciples.has(pk);
  const mode = principleControllerMode[pk] ?? "explore";
  const customContext = principleCustomContext[pk] ?? "";
  const currentVerifyLens =
    principleVerifyLens[pk] ?? null;
  const verifyGens = verifyDerived[pk] ?? [];
  const [verifyLoading, setVerifyLoading] = useState(false);
  const isSel =
    selectedPrinciple?.axis === rootAxis && selectedPrinciple?.name === pathName;
  const derived = subFacetDerived[pk] ?? [];
  const chips = attachedChips[pk] ?? [];
  const ownCombinedIdeas = useMemo(
    () =>
      combinedIdeas.filter(
        (c) => c.topicAxis === rootAxis && c.topicName === pathName,
      ),
    [combinedIdeas, rootAxis, pathName],
  );
  const showOwnCombineLoading =
    isSel && combineStatus === "loading" && ownCombinedIdeas.length === 0;
  const [openCategory, setOpenCategory] = useState<
    "direction" | "lens" | "result" | "verify-lens" | null
  >("direction");
  const toggleCategory = (
    cat: "direction" | "lens" | "result" | "verify-lens",
  ) => setOpenCategory((prev) => (prev === cat ? null : cat));
  const [subFacetLoading, setSubFacetLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [showFullFacet, setShowFullFacet] = useState(false);
  const fullFacetText = `${facetName} — ${facetText}`;
  // Build ancestor chain. Each row renders "제목 — 내용..." one-liner so we
  // resolve content for each level where possible:
  //   - Topic: no content (title itself is the full text)
  //   - Axis: decomposition.axisToPrinciple[rootAxis]
  //   - Direct child of axis: facetDecompositions[rootAxis][segName]
  //   - Deeper descendants: fall back to title-only (lookup gets expensive)
  // Each entry also carries shortTitle/fullText/label for the fullscreen
  // journey view.
  const pathSegments = pathName.split(">");
  const ancestorEntries: AncestorEntry[] = [];
  if (decomposition?.topicText) {
    ancestorEntries.push({
      title: decomposition.topicText,
      shortTitle: decomposition.topicText,
      pk: `주제::${decomposition.topicText}`,
      label: "주제",
    });
  }
  const axisPrinciple = decomposition?.axisToPrinciple?.[rootAxis];
  ancestorEntries.push({
    title: axisPrinciple ? `${rootAxis} — ${axisPrinciple}` : rootAxis,
    shortTitle: rootAxis,
    fullText: axisPrinciple,
    pk: principleKey(rootAxis, "축 전체"),
    label: "축",
  });
  {
    let acc = "";
    for (let i = 0; i < pathSegments.length - 1; i++) {
      acc = acc ? `${acc}>${pathSegments[i]}` : pathSegments[i];
      const segName = pathSegments[i];
      // Direct child of axis (depth 1 from axis): look up in facetDecompositions.
      // Deeper levels aren't easily resolvable here — fall back to just segName.
      const segContent =
        i === 0 ? facetDecompositions?.[rootAxis]?.[segName] : undefined;
      ancestorEntries.push({
        title: segContent ? `${segName} — ${segContent}` : segName,
        shortTitle: segName,
        fullText: segContent,
        pk: principleKey(rootAxis, acc),
        label: `세부 facet · 레벨 ${i + 1}`,
      });
    }
  }
  const currentEntry: AncestorEntry = {
    title: fullFacetText,
    shortTitle: facetName,
    fullText: facetText,
    pk,
    label: "세부 facet · 현재",
  };
  const journeyEntries: AncestorEntry[] = [...ancestorEntries, currentEntry];
  // Global grow-only expansion — survives remounts and never collapses so the
  // tree layout stays stable at every depth.
  const expanded = expandedPrinciples.has(pk);
  const controlsRef = useRef<HTMLDivElement>(null);
  const derivedRef = useRef<HTMLDivElement>(null);
  const prevDerivedCountRef = useRef(0);

  // Auto-scroll when controls first appear (expanded transitions to true).
  useLayoutEffect(() => {
    if (!expanded) return;
    const el = controlsRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(el);
      if (!scroller) return;
      scrollElementIntoView(scroller, el);
    });
    return () => cancelAnimationFrame(raf);
  }, [expanded]);

  // Auto-scroll when a new derived generation appears.
  useLayoutEffect(() => {
    const prev = prevDerivedCountRef.current;
    prevDerivedCountRef.current = derived.length;
    if (derived.length <= prev) return;
    const container = derivedRef.current;
    if (!container) return;
    const lastGen = container.lastElementChild as HTMLElement | null;
    if (!lastGen) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(lastGen);
      if (!scroller) return;
      scrollElementIntoView(scroller, lastGen);
    });
    return () => cancelAnimationFrame(raf);
  }, [derived.length]);

  const handleSelect = () => {
    // Re-click on the currently selected + expanded card closes it.
    // Clicking a different card (or first-time click) expands & marks target.
    if (isSel && expanded) {
      markPrincipleCollapsed(pk);
      selectPrinciple(null);
      return;
    }
    markPrincipleExpanded(pk);
    const sel = { axis: rootAxis, name: pathName, text: facetText };
    selectPrinciple(sel);
    if (!isSel) void runRecommendChips(rootAxis, pathName, facetText);
  };

  const latestFacetChip = chips[chips.length - 1];

  return (
    <div className="flex items-start gap-3">
      <div className="group relative w-[max(24vw,260px)] max-md:w-[calc(100vw-1.5rem)] shrink-0 snap-center">
        <button
          onClick={handleSelect}
          className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
            isBlocker
              ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-black"
              : ""
          } ${
            isSel
              ? "bg-white text-black"
              : isBlocker
                ? "bg-amber-500/15 hover:bg-amber-500/25"
                : "bg-white/[0.08] hover:bg-white/[0.11]"
          }`}
        >
          <div
            className={`text-[14px] font-semibold md:text-[11px] ${
              isSel
                ? "text-black"
                : isBlocker
                  ? "text-amber-100"
                  : "text-text-primary"
            }`}
          >
            {facetName}
          </div>
          <div
            className={`text-[13px] leading-5 md:text-[11px] md:leading-4 ${
              isSel
                ? "text-black/70"
                : isBlocker
                  ? "text-amber-100/80"
                  : "text-text-secondary"
            }`}
          >
            {facetText}
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBlockerPrinciple(pk);
          }}
          title={
            isBlocker
              ? "블로커 해제 (실현을 막는 원리 표시 해제)"
              : "이 원리가 실현의 블로커인지 표시"
          }
          className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] transition-opacity ${
            isBlocker
              ? "bg-amber-500/40 text-amber-50"
              : "bg-white/[0.08] text-text-secondary opacity-0 hover:bg-white/[0.18] hover:text-text-primary group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          ⚠
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addMemo(`${facetName} — ${facetText}`);
          }}
          title="이 원리를 메모로 보내기"
          className={`absolute right-1 top-1 rounded px-1.5 py-0.5 text-[9px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${
            isSel
              ? "bg-black/20 text-black/70 hover:bg-black/30"
              : "bg-white/[0.08] text-text-secondary hover:bg-white/[0.18] hover:text-text-primary"
          }`}
        >
          → 메모
        </button>
      </div>
      {expanded && (
        <div ref={controlsRef} className={CONTROL_PANEL_CLASSES}>
          {/* 공통 입력바 — 현재 facet 명을 태그로, 조건은
              principleCustomContext[pk]에 쌓임. 제출은 현재 모드 액션. */}
          <ConditionInputBar
            tagText={facetName}
            pk={pk}
            existingContext={customContext}
            setPrincipleCustomContext={setPrincipleCustomContext}
            onSubmit={() => {
              if (mode === "verify") {
                void runVerifyFacet(
                  rootAxis,
                  pathName,
                  facetText,
                  currentVerifyLens,
                );
              } else {
                void runDecomposeSubFacet(
                  rootAxis,
                  pathName,
                  facetText,
                  principleDirection[pk] ?? topicDirectionId,
                  principleLens[pk] ?? selectedLens ?? null,
                  principleResultType[pk] ?? topicResultType ?? null,
                );
              }
            }}
          />
          {/* 외부 보더 — 부모 facet + 탭(인너 보더) + 아코디언 전부 포함 */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
            <AncestorStack
              ancestors={ancestorEntries}
              current={currentEntry}
              onClick={() => setShowFullFacet(true)}
            />
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
                        d.id === (principleDirection[pk] ?? topicDirectionId),
                    )?.label ?? (mode === "expand" ? "역사 평행" : "원리")
                  }
                  open={openCategory === "direction"}
                  onToggle={() => toggleCategory("direction")}
                >
                  <DirectionChipRow
                    axis={mode === "expand" ? "expand" : "decompose"}
                    currentDirection={
                      principleDirection[pk] ?? topicDirectionId
                    }
                    customDirections={customDirections}
                    onChangeDirection={(id) => setPrincipleDirection(pk, id)}
                    addCustomDirection={addCustomDirection}
                    removeCustomDirection={removeCustomDirection}
                    hideLabel
                  />
                </ControllerAccordion>
                <ControllerAccordion
                  label="렌즈"
                  tag={(() => {
                    const l = principleLens[pk] ?? selectedLens ?? null;
                    return l ? lensLabel(l) : "없음";
                  })()}
                  open={openCategory === "lens"}
                  onToggle={() => toggleCategory("lens")}
                >
                  <FacetLensRow
                    currentLens={principleLens[pk] ?? selectedLens ?? null}
                    onChangeLens={(lens) => setPrincipleLens(pk, lens)}
                    hideLabel
                  />
                </ControllerAccordion>
                <ControllerAccordion
                  label="실행 결과"
                  tag={
                    (principleResultType[pk] ?? topicResultType ?? null) ??
                    "없음"
                  }
                  open={openCategory === "result"}
                  onToggle={() => toggleCategory("result")}
                >
                  <ResultTypeChipRow
                    value={
                      principleResultType[pk] ?? topicResultType ?? null
                    }
                    onChange={(rt) => setPrincipleResultType(pk, rt)}
                    hideLabel
                  />
                </ControllerAccordion>
              </>
            ) : (
              <ControllerAccordion
                label="렌즈"
                tag={currentVerifyLens ? lensLabel(currentVerifyLens) : "없음"}
                open={openCategory === "verify-lens"}
                onToggle={() => toggleCategory("verify-lens")}
              >
                <FacetLensRow
                  currentLens={currentVerifyLens}
                  onChangeLens={(lens) => setPrincipleVerifyLens(pk, lens)}
                  hideLabel
                />
              </ControllerAccordion>
            )}
          </div>
          <SessionTimelineModal
            open={timelineOpen}
            onClose={() => setTimelineOpen(false)}
          />
          {showFullFacet && (
            <FullFacetJourneyView
              journey={journeyEntries}
              onClose={() => setShowFullFacet(false)}
            />
          )}
        </div>
      )}

      {expanded && derived.length > 0 && (
        <div
          ref={derivedRef}
          className="flex shrink-0 snap-center flex-col gap-3 md:ml-4"
        >
          {derived.map((d) => {
            const directionLabel =
              kBuiltinDirections.find((x) => x.id === d.directionId)?.label ??
              customDirections.find((x) => x.id === d.directionId)?.label ??
              d.directionId;
            const st = subFacetDerivedStatus[d.key];
            const resultLabel = d.resultType ?? "결과: 없음";
            const pal = chipTagPalette(d.key);
            return (
              <div key={d.key} className="flex flex-col gap-1">
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${pal.border} ${pal.bg} ${pal.text}`}
                >
                  {directionLabel} · {lensLabel(d.lens)} · {resultLabel}
                </span>
                {st === "loading" && (
                  <div className="text-[10px] text-text-muted">파생 중…</div>
                )}
                {st === "error" && (
                  <div className="text-[10px] text-red-400">파생 실패</div>
                )}
                <div className="flex flex-col gap-1">
                  {Object.entries(d.subFacets).map(([subName, subText]) => (
                    <FacetNode
                      key={`${d.key}::${subName}`}
                      rootAxis={rootAxis}
                      pathName={`${pathName}>${subName}`}
                      facetName={subName}
                      facetText={subText}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expanded && verifyGens.length > 0 && (
        <div className="flex shrink-0 snap-center flex-col gap-3 md:ml-4">
          {verifyGens.map((v) => {
            const st = verifyDerivedStatus[v.key];
            return (
              <VerifyReportCard
                key={v.key}
                lens={v.lens}
                report={v.report}
                status={st}
                parentAxis={rootAxis}
              />
            );
          })}
        </div>
      )}

      {expanded && chips.length > 0 && (
        <AttachedChipsRow
          chips={chips}
          parentAxis={rootAxis}
          parentPrincipleName={pathName}
          parentPrincipleText={facetText}
          onRemove={(id) => removeAttachedChip(pk, id)}
        />
      )}
      {expanded && (ownCombinedIdeas.length > 0 || showOwnCombineLoading) && (
        <CombinedIdeasBoardSection
          combinedIdeas={ownCombinedIdeas}
          combineStatus={showOwnCombineLoading ? "loading" : "idle"}
          clearCombined={clearCombined}
          focusedCombinedIdeaId={focusedCombinedIdeaId}
          setFocusedCombinedIdeaId={setFocusedCombinedIdeaId}
          parentAxis={rootAxis}
        />
      )}
    </div>
  );
}

type CombinedIdeasBoardSectionProps = {
  combinedIdeas: CombinedIdeaRecord[];
  combineStatus: "idle" | "loading" | "error";
  clearCombined: () => void;
  focusedCombinedIdeaId: string | null;
  setFocusedCombinedIdeaId: (id: string | null) => void;
  parentAxis: string;
};

export function CombinedIdeasBoardSection({
  combinedIdeas,
  combineStatus,
  clearCombined,
  focusedCombinedIdeaId,
  setFocusedCombinedIdeaId,
  parentAxis,
}: CombinedIdeasBoardSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!focusedCombinedIdeaId) return;
    const el = itemRefs.current.get(focusedCombinedIdeaId);
    if (el) {
      const scroller = findScrollAncestor(el);
      if (scroller) scrollElementIntoView(scroller, el);
      else el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const t = setTimeout(() => setFocusedCombinedIdeaId(null), 1600);
    return () => clearTimeout(t);
  }, [focusedCombinedIdeaId, setFocusedCombinedIdeaId]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (combineStatus !== "loading" && combinedIdeas.length === 0) return;
    const raf = requestAnimationFrame(() => {
      const scroller = findScrollAncestor(el);
      if (scroller) scrollElementIntoView(scroller, el);
    });
    return () => cancelAnimationFrame(raf);
  }, [combinedIdeas.length, combineStatus]);

  // Group combined ideas by chipLabel so each combine session gets its own
  // colored pill tag (mirrors the axis-decomposition generation grouping).
  const groups = useMemo(() => {
    const acc = new Map<string, CombinedIdeaRecord[]>();
    for (const idea of combinedIdeas) {
      const key = idea.chipLabel || "조합";
      const arr = acc.get(key) ?? [];
      arr.push(idea);
      acc.set(key, arr);
    }
    return Array.from(acc.entries());
  }, [combinedIdeas]);

  return (
    <div
      ref={containerRef}
      className="flex shrink-0 snap-center flex-col gap-3 md:ml-4"
    >
      {combineStatus === "loading" && combinedIdeas.length === 0 && (
        <div className="md:pl-8">
          <p className="text-[11px] text-text-muted">아이디어 생성 중...</p>
        </div>
      )}

      {groups.map(([chipLabel, ideas]) => {
        const pal = chipTagPalette(chipLabel);
        return (
          <div key={chipLabel} className="flex flex-col gap-1">
            <div className="flex items-center gap-1 md:pl-8">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${pal.border} ${pal.bg} ${pal.text}`}
              >
                {chipLabel}
              </span>
              <button
                onClick={clearCombined}
                title="조합 결과 초기화"
                aria-label="조합 결과 초기화"
                className={`rounded-full border px-1.5 text-[10px] hover:brightness-125 ${pal.border} ${pal.bg} ${pal.text}`}
              >
                ×
              </button>
            </div>
            <div className="relative flex items-start md:pl-8">
              <ul className="flex flex-col gap-1">
                {ideas.map((idea) => (
                  <li
                    key={idea.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(idea.id, el);
                      else itemRefs.current.delete(idea.id);
                    }}
                    className="flex items-start"
                  >
                    <FacetNode
                      rootAxis={parentAxis}
                      pathName={idea.title}
                      facetName={idea.title}
                      facetText={idea.summary}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type VerifyReportCardProps = {
  lens: SelectedLens | null;
  report: {
    target: string;
    baselineProduct?: string;
    baselineLimitation?: string;
    requirements: RequirementPart[];
    edges: RequirementEdge[];
    danglingNeeds: DanglingNeed[];
  };
  status?: "idle" | "loading" | "error";
  parentAxis: string;
};

// Renders a single verify generation as a *typed-requirement composition*:
//   - header pill (증명 · lens)
//   - target line (목표)
//   - 필수 요건 list — each requirement is a card with:
//       · name + feasibility badge (가능 / 불가능 / 판정보류)
//       · description + rationale
//       · 입력 pills (red if dangling, green if supplied by an edge)
//       · 출력 pills
//       · when infeasible: substituteDirections rendered as FacetNodes so
//         the user can further decompose / combine them with chips.
//   - 누락 매칭 list — dangling input tokens that no requirement supplies.
function VerifyReportCard({
  lens,
  report,
  status,
  parentAxis,
}: VerifyReportCardProps) {
  const {
    selectPrinciple,
    setChipFocusTargetOutput,
    setChipFocusExcludeNeed,
    setChipFocusRequirements,
    setChipPanelOpen,
    runRecommendChips,
    runChipFocusMatrix,
    expandedPrinciples,
    markPrincipleExpanded,
  } = useIdea();
  const matrixReqs = report.requirements.map((r) => ({
    id: r.id,
    name: r.name,
    needs: r.needs,
    provides: r.provides,
  }));
  // Topological sort by edges (provides→needs). This drives both the
  // compact 실행 흐름 pipeline and the detailed requirement list below,
  // so a user reads the chain of dependencies in one consistent order.
  // Tier (기반 → 결합 → 완성) is used only as a tiebreaker when the DAG
  // leaves siblings unordered.
  const tierOrder: Record<string, number> = { 기반: 0, 결합: 1, 완성: 2 };
  const orderedReqs = (() => {
    const reqs = report.requirements;
    const byId = new Map(reqs.map((r) => [r.id, r] as const));
    const inDeg = new Map<string, number>();
    const outAdj = new Map<string, string[]>();
    for (const r of reqs) {
      inDeg.set(r.id, 0);
      outAdj.set(r.id, []);
    }
    for (const e of report.edges) {
      if (!byId.has(e.fromId) || !byId.has(e.toId)) continue;
      inDeg.set(e.toId, (inDeg.get(e.toId) ?? 0) + 1);
      outAdj.get(e.fromId)!.push(e.toId);
    }
    const prio = (r: RequirementPart) =>
      (tierOrder[r.tier] ?? 9) * 100 + r.id.charCodeAt(0);
    const queue: RequirementPart[] = reqs
      .filter((r) => (inDeg.get(r.id) ?? 0) === 0)
      .sort((a, b) => prio(a) - prio(b));
    const order: RequirementPart[] = [];
    const seen = new Set<string>();
    while (queue.length > 0) {
      queue.sort((a, b) => prio(a) - prio(b));
      const cur = queue.shift()!;
      if (seen.has(cur.id)) continue;
      seen.add(cur.id);
      order.push(cur);
      for (const toId of outAdj.get(cur.id) ?? []) {
        inDeg.set(toId, (inDeg.get(toId) ?? 0) - 1);
        if ((inDeg.get(toId) ?? 0) === 0 && !seen.has(toId)) {
          const next = byId.get(toId);
          if (next) queue.push(next);
        }
      }
    }
    // Safety net: append disconnected / cycle-stuck nodes in tier order.
    for (const r of [...reqs].sort((a, b) => prio(a) - prio(b))) {
      if (!seen.has(r.id)) order.push(r);
    }
    return order;
  })();

  // Click a dangling need pill: find chips that *provide* that token.
  const openChipPanelForOutput = (token: string, requirementId: string) => {
    const owner = report.requirements.find((r) => r.id === requirementId);
    const sel = {
      axis: parentAxis,
      name: `${token} 공급원`,
      text: owner
        ? `${owner.name} 요건이 필요로 하는 "${token}"의 공급원`
        : `"${token}"의 공급원`,
    };
    selectPrinciple(sel);
    setChipFocusTargetOutput(token);
    setChipFocusExcludeNeed(null);
    setChipFocusRequirements(matrixReqs);
    setChipPanelOpen(true);
    void runChipFocusMatrix(sel.axis, sel.name, sel.text);
  };

  // Click a non-dangling need pill: find lateral alternatives — "produce
  // the owner's provides WITHOUT depending on this need" (wingless-fan).
  const openChipPanelExcludingNeed = (
    excludeToken: string,
    owner: RequirementPart,
  ) => {
    const targetProvide = owner.provides[0];
    if (!targetProvide) return;
    const sel = {
      axis: parentAxis,
      name: `${targetProvide} 공급원 (${excludeToken} 제외)`,
      text: `${owner.name} 요건을 "${excludeToken}" 없이 구현하는 대안 — ${targetProvide}을(를) 다른 메커니즘으로 산출`,
    };
    selectPrinciple(sel);
    setChipFocusTargetOutput(targetProvide);
    setChipFocusExcludeNeed(excludeToken);
    setChipFocusRequirements(matrixReqs);
    setChipPanelOpen(true);
    void runChipFocusMatrix(sel.axis, sel.name, sel.text);
  };

  const widthCls = "w-[max(24vw,260px)] max-md:w-[calc(100vw-1.5rem)]";

  return (
    <div className="flex flex-col gap-2 md:pl-8">
      <span className="inline-flex w-fit items-center rounded-full border border-amber-400/70 bg-amber-500/25 px-2.5 py-0.5 text-[10px] font-medium text-amber-100">
        증명 · {lensLabel(lens)}
      </span>
      {status === "loading" && (
        <div className="text-[11px] text-text-muted">검증 중…</div>
      )}
      {status === "error" && (
        <div className="text-[11px] text-red-400">검증 실패</div>
      )}
      {report.target && (
        <div
          className={`${widthCls} text-[13px] leading-5 text-text-primary md:text-[12px] md:leading-4`}
        >
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            목표
          </span>
          <div className="mt-0.5 font-semibold">{report.target}</div>
        </div>
      )}
      {report.baselineLimitation && (
        <div
          className={`${widthCls} rounded-md bg-white/[0.04] px-3 py-2 text-[11px] leading-5 md:text-[10px] md:leading-4`}
        >
          <div className="text-text-secondary">
            <span className="text-[9px] uppercase tracking-wider text-rose-200/80">
              한계 ·{" "}
            </span>
            {report.baselineLimitation}
          </div>
        </div>
      )}
      {orderedReqs.length > 0 && (
        <div
          className={`${widthCls} rounded-md bg-white/[0.04] px-3 py-2`}
        >
          <div className="mb-1.5 text-[9px] uppercase tracking-wider text-text-muted">
            실행 흐름
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
            {orderedReqs.map((r, i) => {
              const pal = feasibilityPalette[r.feasibility];
              const weak =
                r.feasibility === "infeasible" || r.feasibility === "unknown";
              return (
                <Fragment key={r.id}>
                  {i > 0 && (
                    <span className="text-[11px] text-text-muted md:text-[10px]">
                      →
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] md:text-[10px] ${pal.bg} ${pal.text}`}
                  >
                    <span className="font-bold">{r.id}</span>
                    <span>{r.name}</span>
                    {weak && (
                      <span
                        className={
                          r.feasibility === "infeasible"
                            ? "text-rose-200"
                            : "text-slate-200"
                        }
                      >
                        ⚠
                      </span>
                    )}
                  </span>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
      <ul className={`${widthCls} flex flex-col gap-0.5`}>
        {orderedReqs.map((r) => {
          const pal = feasibilityPalette[r.feasibility];
          const hasIO = r.needs.length > 0 || r.provides.length > 0;
          const pk = principleKey(parentAxis, r.name);
          const isExpanded = expandedPrinciples.has(pk);
          const expandReq = () => {
            const sel = {
              axis: parentAxis,
              name: r.name,
              text: r.description || r.name,
            };
            selectPrinciple(sel);
            markPrincipleExpanded(pk);
            void runRecommendChips(parentAxis, r.name, sel.text);
          };
          if (isExpanded) {
            // Hand off to the standard FacetNode so the user gets the
            // same decompose controller as any other facet in the tree.
            return (
              <li key={r.id}>
                <FacetNode
                  rootAxis={parentAxis}
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
                    {r.description && r.name && r.description !== r.name && (
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
                    {r.needs.length > 0 && r.provides.length > 0 && " → "}
                    {r.provides.length > 0 && r.provides.join(" + ")}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {/* 약점 → 새 목표 (여러 개 공존 가능). 각 약점이 자기 목표문과
          자기 해결 매트릭스를 갖는다. 사용자가 어느 쪽부터 뚫을지 고름.
          약점 종류:
            · infeasible — conflictingNeed 혹은 첫 need를 제외하고 매칭
            · unknown — 신뢰도 낮음, provides를 공급원 매칭
            · dangling need — 아무도 공급 안 하는 토큰, 공급원 매칭 */}
      {(() => {
        type WeakPoint = {
          key: string;
          label: string;
          reason: string;
          subGoal: string;
          onResolve: () => void;
        };
        const weakPoints: WeakPoint[] = [];

        for (const r of orderedReqs) {
          if (r.feasibility === "infeasible") {
            const target = r.provides[0];
            const exclude =
              r.conflictingNeed ?? r.needs[0] ?? undefined;
            weakPoints.push({
              key: `req-${r.id}`,
              label: `${r.id}. ${r.name}`,
              reason:
                r.rationale ||
                (exclude ? `"${exclude}"가 다른 요건과 모순` : "구현 불가"),
              subGoal:
                r.resolvedGoal ||
                (exclude && target
                  ? `${exclude} 없이 ${target}을 만드는 방법`
                  : r.name),
              onResolve: () => {
                if (exclude) openChipPanelExcludingNeed(exclude, r);
                else if (target) openChipPanelForOutput(target, r.id);
              },
            });
          } else if (r.feasibility === "unknown") {
            const target = r.provides[0];
            weakPoints.push({
              key: `req-${r.id}`,
              label: `${r.id}. ${r.name}`,
              reason: r.rationale || "현재 정보로는 성립 여부 판정 불가",
              subGoal: target
                ? `${target}을 안정적으로 만드는 방법`
                : `${r.name}의 성립 조건`,
              onResolve: () => {
                if (target) openChipPanelForOutput(target, r.id);
              },
            });
          }
        }
        // dangling need(공급원 없음)는 약점으로 노출하지 않음.
        // "구체적인 모순/판정불가"가 있는 요건만 사용자가 뚫을 가치가 있음.
        if (weakPoints.length === 0) return null;

        const circled = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];

        return (
          <>
            <div
              className={`${widthCls} mt-1 text-[11px] text-text-muted md:text-[10px]`}
            >
              {weakPoints.length === 1
                ? "약점 발견 — 새 목표"
                : `약점 ${weakPoints.length}개 — 어느 쪽부터 뚫을까?`}
            </div>
            {weakPoints.map((wp, i) => (
              <div
                key={wp.key}
                className={`${widthCls} flex flex-col gap-2 rounded-md bg-white/[0.16] px-3 py-3`}
              >
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  {circled[i] ?? `(${i + 1})`} {wp.label}
                </div>
                <div className="text-[11px] leading-4 text-rose-200/80 md:text-[10px]">
                  {wp.reason}
                </div>
                <div className="text-[14px] font-bold leading-5 text-text-primary md:text-[13px] md:leading-5">
                  {wp.subGoal}
                </div>
                <button
                  onClick={wp.onResolve}
                  className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-black transition-opacity hover:opacity-90 md:text-[12px]"
                >
                  해결 → 매트릭스
                </button>
              </div>
            ))}
          </>
        );
      })()}
    </div>
  );
}

