"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useIdea, principleKey, chipKey } from "../state/IdeaContext";
import {
  DEFAULT_DIRECTION_ID,
  kBuiltinDirections,
  type ThinkingDirection,
} from "@/lib/directions";
import { lensLabel, type SelectedLens } from "@/lib/lenses";
import type { BigCategory } from "@/lib/constants";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import MemoStack from "./MemoStack";
import PendingTopicCard from "./PendingTopicCard";
import ChipifyCard from "./ChipifyCard";
import MemoFolderList from "./MemoFolderList";

// Shared controller container style — every controller (axis, multi-axis,
// sub-facet) uses the same visual card so users see one consistent pattern
// regardless of decomposition depth.
const CONTROL_PANEL_CLASSES =
  "decomp-controller relative flex shrink-0 snap-start flex-col rounded-lg bg-white/[0.05] p-4 gap-3 w-[calc(100vw-3rem)] md:w-[560px]";

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

function chipTagPalette(seed: string) {
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
// Horizontal: element left aligns 18% (mobile) / 8% (desktop) from viewport left.
// Vertical: element TOP aligns just below viewport top (24px margin). This way
// even tall controllers show their first section (사고 방향) rather than being
// pushed up out of view.
function scrollElementIntoView(scroller: HTMLElement, el: HTMLElement) {
  const cRect = el.getBoundingClientRect();
  const sRect = scroller.getBoundingClientRect();
  const isMobile = sRect.width <= 768;
  const desiredLeftFrac = isMobile ? 0.18 : 0.08;
  const desiredLeft = sRect.left + sRect.width * desiredLeftFrac;
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
    runDecomposeSubFacet,
    topicPurposeId,
    commitPending,
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
        <div className="flex-1 overflow-auto px-6 py-6">
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
          multiAxisDirection={DEFAULT_DIRECTION_ID}
          multiAxisLens={null}
          multiAxisResultType={null}
          pendingTopic={pendingTopic}
          topicPurposeId={topicPurposeId}
          commitPending={commitPending}
          runDecomposeFacet={runDecomposeFacet}
          runDecomposeSubFacet={runDecomposeSubFacet}
          runDecomposeMultiAxis={runDecomposeMultiAxis}
        />
      </div>
    );
  }

  if (!decomposition) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-text-muted">
            위 입력바에 주제를 입력해 사고확장을 시작하세요
          </p>
        </div>
      </div>
    );
  }

  const axes = Object.entries(decomposition.axisToPrinciple);
  const multiMode = selectedAxes.size >= 2;
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
      <header className="px-6 pt-6">
        <p className="text-[11px] uppercase tracking-wider text-text-muted">
          주제
        </p>
        <h1 className="mt-1 whitespace-nowrap text-lg font-bold text-text-primary">
          {decomposition.topicText}
        </h1>
      </header>

      <div className="flex-1 snap-x snap-mandatory scroll-px-6 overflow-auto px-6 py-6 md:snap-none">
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
              currentLens={multiAxisLens}
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
        multiAxisDirection={multiAxisDirection}
        multiAxisLens={multiAxisLens}
        multiAxisResultType={multiAxisResultType}
        pendingTopic={pendingTopic}
        topicPurposeId={topicPurposeId}
        commitPending={commitPending}
        runDecomposeFacet={runDecomposeFacet}
        runDecomposeSubFacet={runDecomposeSubFacet}
        runDecomposeMultiAxis={runDecomposeMultiAxis}
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
  multiAxisDirection: string;
  multiAxisLens: SelectedLens | null;
  multiAxisResultType: BigCategory | null;
  pendingTopic: string | null;
  topicPurposeId: string;
  commitPending: (purposeId: string) => Promise<void>;
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
  multiAxisDirection,
  multiAxisLens,
  multiAxisResultType,
  pendingTopic,
  topicPurposeId,
  commitPending,
  runDecomposeFacet,
  runDecomposeSubFacet,
  runDecomposeMultiAxis,
}: MobileDecomposeFabProps) {
  const [controllerVisible, setControllerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const visibleSet = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visibleSet.add(e.target);
          else visibleSet.delete(e.target);
        }
        setControllerVisible(visibleSet.size > 0);
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

  // For facet-level: only show once user has picked at least one chip.
  // Pending-topic case always shows (purpose has default "problem").
  let hasChip = false;
  if (canPending) {
    hasChip = true;
  } else if (canMulti) {
    hasChip =
      multiAxisDirection !== DEFAULT_DIRECTION_ID ||
      multiAxisLens !== null ||
      multiAxisResultType !== null;
  } else if (selectedPrinciple) {
    const { axis, name } = selectedPrinciple;
    if (name === "축 전체") {
      hasChip =
        (facetDirection[axis] ?? DEFAULT_DIRECTION_ID) !==
          DEFAULT_DIRECTION_ID ||
        (facetLens[axis] ?? null) !== null ||
        (facetResultType[axis] ?? null) !== null;
    } else {
      const pk = principleKey(axis, name);
      hasChip =
        (principleDirection[pk] ?? DEFAULT_DIRECTION_ID) !==
          DEFAULT_DIRECTION_ID ||
        (principleLens[pk] ?? null) !== null ||
        (principleResultType[pk] ?? null) !== null;
    }
  }
  if (!hasChip) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      if (canPending) {
        await commitPending(topicPurposeId);
        return;
      }
      if (canMulti) {
        await runDecomposeMultiAxis(
          multiAxisDirection,
          multiAxisLens,
          multiAxisResultType,
        );
        return;
      }
      if (!selectedPrinciple) return;
      const { axis, name, text } = selectedPrinciple;
      if (name === "축 전체") {
        await runDecomposeFacet(
          axis,
          facetDirection[axis] ?? DEFAULT_DIRECTION_ID,
          facetLens[axis] ?? null,
          facetResultType[axis] ?? null,
        );
      } else {
        const pk = principleKey(axis, name);
        await runDecomposeSubFacet(
          axis,
          name,
          text,
          principleDirection[pk] ?? DEFAULT_DIRECTION_ID,
          principleLens[pk] ?? null,
          principleResultType[pk] ?? null,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}
      className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-6 py-2.5 text-[14px] font-bold text-black shadow-lg md:hidden"
    >
      <span>분해 시작</span>
      {loading ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 animate-spin"
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
              currentDirection={facetDirection[axis] ?? DEFAULT_DIRECTION_ID}
              onChangeDirection={(directionId) =>
                setFacetDirection(axis, directionId)
              }
              customDirections={customDirections}
              addCustomDirection={addCustomDirection}
              removeCustomDirection={removeCustomDirection}
              currentLens={facetLens[axis] ?? null}
              onChangeLens={(lens) => setFacetLens(axis, lens)}
              currentResultType={facetResultType[axis] ?? null}
              onChangeResultType={(rt) => setFacetResultType(axis, rt)}
            />
            {showArrowBelow && (
              <div className="flex w-[max(20vw,220px)] max-md:w-[calc(100vw-3rem)] justify-end px-2 py-3">
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
  const [chipsCollapsed, setChipsCollapsed] = useState(false);
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
        <DirectionChipRow
          currentDirection={currentDirection}
          customDirections={customDirections}
          onChangeDirection={onChangeDirection}
          addCustomDirection={addCustomDirection}
          removeCustomDirection={removeCustomDirection}
          collapsed={chipsCollapsed}
          onCollapseChange={setChipsCollapsed}
        />
        <FacetLensRow
          currentLens={currentLens}
          onChangeLens={onChangeLens}
          collapsed={chipsCollapsed}
          onCollapseChange={setChipsCollapsed}
        />
        <ResultTypeChipRow
          value={currentResultType}
          onChange={onChangeResultType}
          collapsed={chipsCollapsed}
          onCollapseChange={setChipsCollapsed}
        />
        {(currentDirection !== DEFAULT_DIRECTION_ID ||
          currentLens !== null ||
          currentResultType !== null) && (
          <button
            onClick={onDecompose}
            disabled={status === "loading"}
            className="mt-2 hidden items-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black transition-opacity md:flex"
          >
            <span>분해 시작</span>
            {status === "loading" ? <DecomposeSpinnerIcon /> : <DecomposeArrowIcon />}
          </button>
        )}
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
  const [chipsCollapsed, setChipsCollapsed] = useState(false);
  const { addMemo, setChipPanelOpen, attachedChips } = useIdea();
  const controlsRef = useRef<HTMLDivElement>(null);
  const generationsRef = useRef<HTMLDivElement>(null);
  const showControls = showControlsProp && active && !hideRightSide;
  const axisChips = attachedChips[principleKey(axis, "축 전체")] ?? [];
  const latestAxisChip = axisChips[axisChips.length - 1];
  const genCount = generations?.length ?? 0;
  const prevGenCountRef = useRef(0);

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
    <div className="flex items-start">
      <div
        ref={(el) => registerCardRef?.(axis, el)}
        className="group relative w-[max(20vw,220px)] max-md:w-[calc(100vw-3rem)] shrink-0 snap-start"
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
          <button
            onClick={() => setChipPanelOpen(true)}
            title="칩 라이브러리 열어 이 축과 조합하기"
            className="self-start rounded-full bg-white/[0.08] px-5 py-2 text-[14px] text-text-primary hover:bg-white/[0.16] md:px-3 md:py-1 md:text-[11px]"
          >
            + 축 조합
          </button>
          <DirectionChipRow
            currentDirection={currentDirection}
            customDirections={customDirections}
            onChangeDirection={onChangeDirection}
            addCustomDirection={addCustomDirection}
            removeCustomDirection={removeCustomDirection}
            collapsed={chipsCollapsed}
            onCollapseChange={setChipsCollapsed}
          />
          <FacetLensRow
            currentLens={currentLens}
            onChangeLens={onChangeLens}
            collapsed={chipsCollapsed}
            onCollapseChange={setChipsCollapsed}
          />
          <ResultTypeChipRow
            value={currentResultType}
            onChange={onChangeResultType}
            collapsed={chipsCollapsed}
            onCollapseChange={setChipsCollapsed}
          />
          {(currentDirection !== DEFAULT_DIRECTION_ID ||
            currentLens !== null ||
            currentResultType !== null) && (
            <button
              onClick={() =>
                onDecomposeFacet(
                  currentDirection,
                  currentLens,
                  currentResultType,
                )
              }
              disabled={fStatus === "loading"}
              className="mt-2 hidden items-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black transition-opacity md:flex"
            >
              <span>분해 시작</span>
              {fStatus === "loading" ? (
                <DecomposeSpinnerIcon />
              ) : (
                <DecomposeArrowIcon />
              )}
            </button>
          )}
        </div>
      )}

      {showControls && generations && generations.length > 0 && (
        <div
          ref={generationsRef}
          className="flex shrink-0 snap-start flex-col gap-4 md:pl-4"
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
                <div className="flex items-center gap-1">
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

function FacetNode({
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
  } = useIdea();

  const pk = principleKey(rootAxis, pathName);
  const isSel =
    selectedPrinciple?.axis === rootAxis && selectedPrinciple?.name === pathName;
  const derived = subFacetDerived[pk] ?? [];
  const chips = attachedChips[pk] ?? [];
  const [chipsCollapsed, setChipsCollapsed] = useState(false);
  const [subFacetLoading, setSubFacetLoading] = useState(false);
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
    <div className="flex items-start">
      <div className="group relative w-[max(20vw,220px)] max-md:w-[calc(100vw-3rem)] shrink-0 snap-start">
        <button
          onClick={handleSelect}
          className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
            isSel
              ? "bg-white text-black"
              : "bg-white/[0.08] hover:bg-white/[0.11]"
          }`}
        >
          <div
            className={`text-[14px] font-semibold md:text-[11px] ${
              isSel ? "text-black" : "text-text-primary"
            }`}
          >
            {facetName}
          </div>
          <div
            className={`text-[13px] leading-5 md:text-[11px] md:leading-4 ${
              isSel ? "text-black/70" : "text-text-secondary"
            }`}
          >
            {facetText}
          </div>
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
            <button
              onClick={() => setChipPanelOpen(true)}
              title="칩 라이브러리 열어 이 원리와 조합하기"
              className="self-start rounded-full bg-white/[0.08] px-5 py-2 text-[14px] text-text-primary hover:bg-white/[0.16] md:px-3 md:py-1 md:text-[11px]"
            >
              + 축 조합
            </button>
            <DirectionChipRow
              currentDirection={
                principleDirection[pk] ?? DEFAULT_DIRECTION_ID
              }
              customDirections={customDirections}
              onChangeDirection={(id) => setPrincipleDirection(pk, id)}
              addCustomDirection={addCustomDirection}
              removeCustomDirection={removeCustomDirection}
              collapsed={chipsCollapsed}
              onCollapseChange={setChipsCollapsed}
            />
            <FacetLensRow
              currentLens={principleLens[pk] ?? null}
              onChangeLens={(lens) => setPrincipleLens(pk, lens)}
              collapsed={chipsCollapsed}
              onCollapseChange={setChipsCollapsed}
            />
            <ResultTypeChipRow
              value={principleResultType[pk] ?? null}
              onChange={(rt) => setPrincipleResultType(pk, rt)}
              collapsed={chipsCollapsed}
              onCollapseChange={setChipsCollapsed}
            />
            {((principleDirection[pk] ?? DEFAULT_DIRECTION_ID) !==
              DEFAULT_DIRECTION_ID ||
              (principleLens[pk] ?? null) !== null ||
              (principleResultType[pk] ?? null) !== null) && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={async () => {
                    setSubFacetLoading(true);
                    try {
                      await runDecomposeSubFacet(
                        rootAxis,
                        pathName,
                        facetText,
                        principleDirection[pk] ?? DEFAULT_DIRECTION_ID,
                        principleLens[pk] ?? null,
                        principleResultType[pk] ?? null,
                      );
                    } finally {
                      setSubFacetLoading(false);
                    }
                  }}
                  disabled={subFacetLoading}
                  className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black hover:bg-white/90 md:flex"
                >
                  <span>분해 시작</span>
                  {subFacetLoading ? (
                    <DecomposeSpinnerIcon />
                  ) : (
                    <DecomposeArrowIcon />
                  )}
                </button>
              </div>
            )}
        </div>
      )}

      {derived.length > 0 && (
        <div
          ref={derivedRef}
          className="flex shrink-0 snap-start flex-col gap-3 md:ml-4"
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

      {chips.length > 0 && (
        <AttachedChipsRow
          chips={chips}
          parentAxis={rootAxis}
          parentPrincipleName={pathName}
          parentPrincipleText={facetText}
          onRemove={(id) => removeAttachedChip(pk, id)}
        />
      )}
    </div>
  );
}

