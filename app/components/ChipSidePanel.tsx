"use client";

import { useEffect, useState } from "react";
import {
  useIdea,
  principleKey,
  chipKey,
  type AttachedChip,
} from "../state/IdeaContext";
import {
  kIndustryPool,
  kPsychologyPool,
  kObjectPool,
  chipKindLabel,
  kSimilarCategories,
  type ChipKind,
} from "@/lib/constants";
import { chipSearchModeLabel, type ChipSearchMode } from "@/lib/prompts";
import FacetLensRow from "./FacetLensRow";

type Tab = "library" | "similar" | "search";
type Staged =
  | { source: "library"; kind: ChipKind; chipText: string; kindOrCategory: string }
  | {
      source: "similar";
      chipText: string;
      reason?: string;
      kindOrCategory: string;
    }
  | { source: "search"; chipText: string; kindOrCategory: string };

const pools: { kind: ChipKind; items: string[] }[] = [
  { kind: "industry", items: kIndustryPool },
  { kind: "psychology", items: kPsychologyPool },
  { kind: "object", items: kObjectPool },
];

const searchModes: ChipSearchMode[] = ["keyword", "attribute", "mechanism"];

const searchPlaceholder: Record<ChipSearchMode, string> = {
  keyword: "키워드 (예: 시간, 물, 관계)",
  attribute: "특성 (예: 충격흡수, 자기복제, 역설)",
  mechanism: "메커니즘 문장 (예: 누르면 튕겨나옴)",
};

const newChipId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const sameChip = (a: Staged | null, b: Staged) =>
  a?.chipText === b.chipText && a?.source === b.source;

export default function ChipSidePanel() {
  const {
    selectedPrinciple,
    chipRecommendations,
    chipStatus,
    chipDecompositions,
    chipDecompStatus,
    runDecomposeChip,
    chipDecompLens,
    setChipDecompLens,
    chipSearchQuery,
    setChipSearchQuery,
    chipSearchMode,
    setChipSearchMode,
    chipSearchResults,
    chipSearchStatus,
    runChipSearch,
    chipSearchHistory,
    rerunChipSearch,
    clearChipSearchHistory,
    attachChip,
    runCombine,
    setChipPanelOpen,
    userChips,
    removeUserChip,
  } = useIdea();

  const hasPrinciple = Boolean(selectedPrinciple);
  const [tab, setTab] = useState<Tab>(hasPrinciple ? "library" : "search");
  const [staged, setStaged] = useState<Staged | null>(null);

  useEffect(() => {
    setStaged(null);
    if (!hasPrinciple && tab === "similar") setTab("search");
  }, [selectedPrinciple, hasPrinciple, tab]);

  const pk = selectedPrinciple
    ? principleKey(selectedPrinciple.axis, selectedPrinciple.name)
    : null;
  const recs = pk ? chipRecommendations[pk] : undefined;
  const recStatus = pk ? chipStatus[pk] : undefined;

  const stagedKey = staged
    ? chipKey(
        staged.source === "library" ? staged.kind : "industry",
        staged.chipText,
      )
    : null;
  const stagedDecomp = stagedKey ? chipDecompositions[stagedKey] : undefined;
  const stagedDStatus = stagedKey ? chipDecompStatus[stagedKey] : undefined;

  const stage = (chip: Staged) => {
    setStaged((cur) => (sameChip(cur, chip) ? null : chip));
  };

  const attachAndCombine = () => {
    if (!staged || !pk) return;
    const kind = staged.source === "library" ? staged.kind : undefined;
    const attached: AttachedChip = {
      id: newChipId(),
      chipText: staged.chipText,
      chipKind: kind,
      reason: staged.source === "similar" ? staged.reason : undefined,
      source: staged.source,
      kindOrCategory: staged.kindOrCategory,
    };
    attachChip(pk, attached);
    if (kind) void runDecomposeChip(kind, staged.chipText);
    void runCombine({
      chipKind: kind ?? null,
      chipCategory:
        staged.source !== "library" ? staged.kindOrCategory : null,
      chipText: staged.chipText,
      chipReason: staged.source === "similar" ? staged.reason ?? null : null,
    });
    setStaged(null);
  };

  const decomposeStaged = () => {
    if (!staged) return;
    // Library chips have a kind; search/similar chips fall back to "industry"
    // (kind is only a hint — the API now generates free-form axes anyway).
    const kind = staged.source === "library" ? staged.kind : "industry";
    void runDecomposeChip(kind, staged.chipText);
  };

  const canDecompose = !!staged;
  const searchBusy = chipSearchStatus === "loading";

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-black md:w-80">
      <header className="flex items-start justify-between px-4 py-3">
        <div className="min-w-0">
          {hasPrinciple && (
            <>
              <div className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                {selectedPrinciple!.name === "축 전체"
                  ? "조합 대상 축"
                  : "조합 대상 원리"}
              </div>
              <div className="mt-0.5 truncate text-[15px] font-semibold text-text-primary md:text-[12px]">
                {selectedPrinciple!.name === "축 전체"
                  ? selectedPrinciple!.axis
                  : `${selectedPrinciple!.axis} · ${selectedPrinciple!.name}`}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex px-2 py-2 text-[14px] md:text-[11px]">
        <TabBtn active={tab === "library"} onClick={() => setTab("library")}>
          라이브러리
        </TabBtn>
        {hasPrinciple && (
          <TabBtn active={tab === "similar"} onClick={() => setTab("similar")}>
            유사칩
          </TabBtn>
        )}
        <TabBtn active={tab === "search"} onClick={() => setTab("search")}>
          검색
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "library" && (
          <div className="flex flex-col gap-3">
            {pools.map(({ kind, items }) => {
              const kindUserChips = userChips.filter((uc) => uc.kind === kind);
              return (
              <div key={kind}>
                <div className="mb-1 text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                  {chipKindLabel[kind]}
                </div>
                {kindUserChips.length > 0 && (
                  <ul className="mb-1 flex flex-col gap-1">
                    {kindUserChips.map((uc) => {
                      const chip: Staged = {
                        source: "library",
                        kind,
                        chipText: uc.text,
                        kindOrCategory: chipKindLabel[kind],
                      };
                      const isStaged = sameChip(staged, chip);
                      return (
                        <li key={uc.id} className="flex items-start gap-1">
                          <button
                            onClick={() => stage(chip)}
                            title={uc.definition || undefined}
                            className={`flex-1 rounded-md px-3 py-2 text-left text-[14px] transition-colors md:px-2 md:py-1 md:text-[11px] ${
                              isStaged
                                ? "bg-white font-bold text-black"
                                : "bg-white/[0.06] text-text-primary hover:bg-white/12"
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9px] ${
                                  isStaged ? "text-black/60" : "text-text-muted"
                                }`}
                              >
                                내
                              </span>
                              <span className="font-semibold">{uc.name}</span>
                            </div>
                            {uc.definition && uc.definition !== uc.name && (
                              <div
                                className={`mt-0.5 line-clamp-2 text-[10px] leading-4 ${
                                  isStaged
                                    ? "text-black/70"
                                    : "text-text-secondary"
                                }`}
                              >
                                {uc.definition}
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => removeUserChip(uc.id)}
                            aria-label="칩 삭제"
                            className="mt-1 rounded text-[10px] text-text-muted hover:text-text-primary"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <ul className="flex flex-col gap-1">
                  {items.map((item) => {
                    const chip: Staged = {
                      source: "library",
                      kind,
                      chipText: item,
                      kindOrCategory: chipKindLabel[kind],
                    };
                    const isStaged = sameChip(staged, chip);
                    const stagedItemKey = chipKey(kind, item);
                    const stagedItemLens =
                      chipDecompLens[stagedItemKey] ?? null;
                    return (
                      <li key={item} className="flex flex-col">
                        <button
                          onClick={() => stage(chip)}
                          className={`w-full rounded-md px-3 py-2 text-left text-[14px] transition-colors md:px-2 md:py-1 md:text-[11px] ${
                            isStaged
                              ? "bg-white font-bold text-black"
                              : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                          }`}
                        >
                          {item}
                        </button>
                        {isStaged && (
                          <div className="mt-1 flex flex-col gap-1.5 rounded-md bg-white/[0.04] px-2 py-1.5">
                            <div>
                              <div className="mb-1 text-[12px] uppercase tracking-wider text-text-muted md:text-[9px]">
                                분해 렌즈
                              </div>
                              <FacetLensRow
                                currentLens={stagedItemLens}
                                onChangeLens={(lens) => {
                                  setChipDecompLens(kind, item, lens);
                                  void runDecomposeChip(
                                    kind,
                                    item,
                                    undefined,
                                    lens,
                                    undefined,
                                  );
                                }}
                              />
                            </div>
                            {stagedDStatus === "loading" && (
                              <p className="text-[10px] text-text-muted">
                                칩 분해 중...
                              </p>
                            )}
                            {stagedDStatus === "error" && (
                              <p className="text-[10px] text-red-400">
                                분해 실패
                              </p>
                            )}
                            {stagedDecomp && (
                              <ul className="flex flex-col gap-1">
                                {Object.entries(stagedDecomp).map(
                                  ([ax, pr]) => (
                                    <li key={ax}>
                                      <button
                                        onClick={() => {
                                          if (!pk || !staged) return;
                                          const kind =
                                            staged.source === "library"
                                              ? staged.kind
                                              : undefined;
                                          const attached: AttachedChip = {
                                            id: newChipId(),
                                            chipText: staged.chipText,
                                            chipKind: kind,
                                            source: staged.source,
                                            kindOrCategory:
                                              staged.kindOrCategory,
                                          };
                                          attachChip(pk, attached);
                                          void runCombine({
                                            chipKind: kind ?? null,
                                            chipCategory:
                                              staged.source !== "library"
                                                ? staged.kindOrCategory
                                                : null,
                                            chipText: staged.chipText,
                                            chipReason: null,
                                            chipFacet: {
                                              axis: ax,
                                              principle: pr,
                                            },
                                          });
                                        }}
                                        disabled={!hasPrinciple}
                                        title={
                                          hasPrinciple
                                            ? `${ax} × 보드 원리 조합`
                                            : "보드에서 원리를 먼저 선택하세요"
                                        }
                                        className="w-full rounded px-1.5 py-1 text-left transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                      >
                                        <div className="text-[10px] font-semibold text-text-primary">
                                          {ax}
                                        </div>
                                        <div className="text-[13px] leading-5 text-text-secondary md:text-[10px] md:leading-4">
                                          {pr}
                                        </div>
                                      </button>
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })}
            {userChips.some((uc) => uc.kind === "memo") && (
              <div>
                <div className="mb-1 text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                  메모
                </div>
                <ul className="flex flex-col gap-1">
                  {userChips
                    .filter((uc) => uc.kind === "memo")
                    .map((uc) => {
                      const chip: Staged = {
                        source: "search",
                        chipText: uc.text,
                        kindOrCategory: "메모",
                      };
                      const isStaged = sameChip(staged, chip);
                      return (
                        <li key={uc.id} className="flex items-start gap-1">
                          <button
                            onClick={() => stage(chip)}
                            title={uc.definition || undefined}
                            className={`flex-1 rounded-md px-3 py-2 text-left text-[14px] transition-colors md:px-2 md:py-1 md:text-[11px] ${
                              isStaged
                                ? "bg-white font-bold text-black"
                                : "bg-white/[0.06] text-text-primary hover:bg-white/12"
                            }`}
                          >
                            <div className="font-semibold">{uc.name}</div>
                            {uc.definition && uc.definition !== uc.name && (
                              <div
                                className={`mt-0.5 line-clamp-2 text-[10px] leading-4 ${
                                  isStaged
                                    ? "text-black/70"
                                    : "text-text-secondary"
                                }`}
                              >
                                {uc.definition}
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => removeUserChip(uc.id)}
                            aria-label="칩 삭제"
                            className="mt-1 rounded text-[10px] text-text-muted hover:text-text-primary"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "similar" && hasPrinciple && (
          <div className="flex flex-col gap-3">
            {recStatus === "loading" && (
              <p className="text-[14px] text-text-muted md:text-[11px]">유사칩 생성 중...</p>
            )}
            {recStatus === "error" && (
              <p className="text-[14px] text-red-400 md:text-[11px]">유사칩 로드 실패</p>
            )}
            {recs &&
              kSimilarCategories.map((cat) => {
                const items = recs[cat] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="mb-1 text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                      {cat}
                    </div>
                    <ul className="flex flex-col gap-1">
                      {items.map((c) => {
                        const chip: Staged = {
                          source: "similar",
                          chipText: c.chipText,
                          reason: c.reason,
                          kindOrCategory: cat,
                        };
                        const isStaged = sameChip(staged, chip);
                        return (
                          <li key={c.chipText}>
                            <button
                              onClick={() => stage(chip)}
                              className={`w-full rounded-md px-3 py-2 text-left transition-colors md:px-2 md:py-1 ${
                                isStaged
                                  ? "bg-white text-black"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div
                                className={`text-[14px] font-semibold md:text-[11px] ${
                                  isStaged ? "text-black" : "text-text-primary"
                                }`}
                              >
                                {c.chipText}
                              </div>
                              <div
                                className={`text-[13px] leading-5 md:text-[10px] md:leading-4 ${
                                  isStaged
                                    ? "text-black/70"
                                    : "text-text-secondary"
                                }`}
                              >
                                {c.reason}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}

        {tab === "search" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1">
              {searchModes.map((m) => {
                const active = chipSearchMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setChipSearchMode(m)}
                    className={`rounded-full px-5 py-2 text-[14px] transition-colors md:px-3 md:py-1 md:text-[11px] ${
                      active
                        ? "bg-white/[0.18] text-text-primary"
                        : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary"
                    }`}
                  >
                    {chipSearchModeLabel[m]}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chipSearchQuery.trim() || searchBusy) return;
                void runChipSearch();
              }}
              className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5 text-text-muted"
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
              <input
                value={chipSearchQuery}
                onChange={(e) => setChipSearchQuery(e.target.value)}
                placeholder={searchPlaceholder[chipSearchMode]}
                className="flex-1 bg-transparent px-1 py-0.5 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[12px]"
              />
              <button
                type="submit"
                disabled={!chipSearchQuery.trim() || searchBusy}
                aria-label="검색"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:opacity-30"
              >
                {searchBusy ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3.5 w-3.5 animate-spin"
                    aria-label="검색 중"
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
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
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

            <div>
              <div className="mb-1 text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                검색 결과
              </div>
              {chipSearchStatus === "error" && (
                <p className="text-[14px] text-red-400 md:text-[11px]">검색 실패</p>
              )}
              {chipSearchStatus !== "loading" &&
                chipSearchResults.length === 0 && (
                  <p className="text-[14px] text-text-muted md:text-[11px]">
                    아직 결과가 없습니다
                  </p>
                )}
              <div className="flex flex-col gap-1">
                {chipSearchResults.map((c) => {
                  const chip: Staged = {
                    source: "search",
                    chipText: c,
                    kindOrCategory: chipSearchModeLabel[chipSearchMode],
                  };
                  const isStaged = sameChip(staged, chip);
                  return (
                    <button
                      key={c}
                      onClick={() => stage(chip)}
                      className={`rounded-md px-3 py-2 text-left text-[14px] transition-colors md:px-2 md:py-1 md:text-[11px] ${
                        isStaged
                          ? "bg-white font-bold text-black"
                          : "text-text-primary hover:bg-white/5"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
                  검색 히스토리
                </div>
                {chipSearchHistory.length > 0 && (
                  <button
                    onClick={clearChipSearchHistory}
                    className="text-[10px] text-text-muted hover:text-text-primary"
                  >
                    지우기
                  </button>
                )}
              </div>
              {chipSearchHistory.length === 0 ? (
                <p className="text-[14px] text-text-muted md:text-[11px]">
                  검색 기록이 없습니다
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {chipSearchHistory.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => void rerunChipSearch(h)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] text-text-secondary hover:bg-white/5 hover:text-text-primary md:px-2 md:py-1 md:text-[11px]"
                      >
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-text-muted">
                          {chipSearchModeLabel[h.mode]}
                        </span>
                        <span className="flex-1 truncate">{h.query}</span>
                        <span className="text-[10px] text-text-muted">
                          {h.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-3 py-3">
        <button
          onClick={decomposeStaged}
          disabled={!canDecompose || stagedDStatus === "loading"}
          aria-label="칩 분해"
          className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[15px] text-white transition-opacity hover:bg-white/[0.16] disabled:opacity-30 md:h-9 md:px-3 md:text-[12px] ${
            hasPrinciple ? "" : "flex-1"
          }`}
          title={
            canDecompose
              ? "선택한 칩을 분해합니다"
              : "칩을 먼저 선택하세요"
          }
        >
          {stagedDStatus === "loading" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 animate-spin"
              aria-label="칩 분해 중"
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
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M6 3v18M18 3v18M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>칩 분해</span>
            </>
          )}
        </button>
        {hasPrinciple && (
          <button
            onClick={attachAndCombine}
            disabled={!staged}
            className="flex flex-1 items-center justify-between rounded-full bg-white px-5 py-2.5 text-[15px] font-bold text-black transition-opacity disabled:opacity-30 md:px-4 md:py-2 md:text-[12px]"
          >
            <span className="truncate">
              {staged ? `조합: ${staged.chipText}` : "칩을 먼저 선택하세요"}
            </span>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
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
    </aside>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1 transition-colors ${
        active
          ? "bg-white/10 text-text-primary"
          : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
