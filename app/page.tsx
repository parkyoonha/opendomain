"use client";

import InputBar from "./components/InputBar";
import LensBar from "./components/LensBar";
import DecompositionTree from "./components/DecompositionTree";
import ChipSidePanel from "./components/ChipSidePanel";
import ResultPanel from "./components/ResultPanel";
import SettingsModal from "./components/SettingsModal";
import MemoSidebar from "./components/MemoSidebar";
import { IdeaProvider, useIdea } from "./state/IdeaContext";

function PageInner() {
  const {
    combinedIdeas,
    combineStatus,
    chipPanelOpen,
    setChipPanelOpen,
    setSettingsOpen,
    userGeminiKey,
    useUserKey,
    error,
    clearError,
    splitMemoPageId,
    activeSplitView,
    setActiveSplitView,
    inputMode,
    memoListMode,
    showMemoList,
    startMemoDraft,
    startTopicDraft,
  } = useIdea();
  const isFreeTier = Boolean(userGeminiKey) && useUserKey;
  const showChipPanel = chipPanelOpen;
  const showResultPanel =
    combinedIdeas.length > 0 || combineStatus === "loading";
  const inSplit = Boolean(splitMemoPageId) && inputMode === "topic";
  const canGoBack = inputMode === "memo" && !memoListMode;
  const chipAsBottomSheet =
    showChipPanel && !inSplit && inputMode === "topic";

  return (
    <div className="relative flex h-full w-full bg-black">
      {!showChipPanel && (
        <button
          onClick={() => setChipPanelOpen(true)}
          aria-label="칩 패널 열기"
          className="safe-top-offset absolute left-3 z-30 hidden h-8 w-8 items-center justify-center rounded-md bg-white/[0.08] text-text-secondary hover:bg-white/[0.16] hover:text-text-primary md:flex"
          title="칩 검색 패널 열기"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <rect
              x="3"
              y="4"
              width="8"
              height="16"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M14 8h6M14 12h6M14 16h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="설정"
        title={
          isFreeTier
            ? "설정 · 무료(Gemini) 사용 중"
            : "설정 · 유료(Claude) 사용 중"
        }
        className={`safe-top-offset absolute right-3 z-30 flex h-9 items-center gap-1 rounded-md px-3 text-[13px] hover:text-text-primary md:h-8 md:text-[10px] ${
          isFreeTier
            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            : "bg-white/[0.08] text-text-secondary hover:bg-white/[0.16]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span>{isFreeTier ? "무료" : "유료"}</span>
      </button>
      <>
          {showChipPanel && (
            <div
              className={
                chipAsBottomSheet
                  ? "absolute inset-x-0 bottom-14 top-1/2 z-40 flex pb-safe-14 bg-neutral-900 shadow-2xl md:relative md:inset-auto md:z-auto md:h-full md:w-80 md:flex-none md:bg-transparent md:pb-0 md:shadow-none"
                  : `${
                      inSplit && activeSplitView !== "chip"
                        ? "hidden md:flex"
                        : "flex"
                    } h-full min-w-0 flex-1 pb-safe-14 md:flex-none md:pb-0`
              }
            >
              <ChipSidePanel />
            </div>
          )}
          <main
            className={`min-w-0 flex-1 flex-col overflow-hidden bg-black pb-safe-14 pt-safe-16 md:pb-0 md:pt-16 ${
              inSplit
                ? activeSplitView === "topic"
                  ? "flex"
                  : "hidden md:flex"
                : showChipPanel && !chipAsBottomSheet
                  ? "hidden md:flex"
                  : "flex"
            }`}
          >
            <InputBar />
            {inputMode !== "memo" && <LensBar />}
            <DecompositionTree />
          </main>
          {inSplit && (
            <div
              className={`${
                activeSplitView === "memo" ? "flex" : "hidden"
              } h-full min-w-0 flex-1 pb-safe-14 pt-safe-16 md:flex md:flex-none md:pb-0 md:pt-16`}
            >
              <MemoSidebar />
            </div>
          )}
          {showResultPanel && <ResultPanel />}
          <nav className="safe-bottom absolute inset-x-0 bottom-0 z-30 flex bg-neutral-900 md:hidden">
            {(
              [
                { key: "topic", label: "사고확장" },
                { key: "memo", label: "메모" },
                { key: "chip", label: "칩" },
              ] as const
            ).map((t) => {
              const active = inSplit
                ? activeSplitView === t.key
                : t.key === "chip"
                  ? showChipPanel
                  : !showChipPanel && inputMode === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.key === "chip") {
                      setChipPanelOpen(true);
                      if (inSplit) setActiveSplitView("chip");
                      return;
                    }
                    if (inSplit) {
                      setActiveSplitView(t.key);
                      return;
                    }
                    if (showChipPanel) setChipPanelOpen(false);
                    if (t.key === "memo" && inputMode !== "memo") {
                      startMemoDraft();
                    } else if (t.key === "topic" && inputMode !== "topic") {
                      startTopicDraft();
                    }
                  }}
                  className={`flex-1 py-3.5 text-[14px] transition-colors ${
                    active
                      ? "text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </>
      <SettingsModal />
      {error && (
        <div className="absolute bottom-4 left-1/2 z-40 flex max-w-[600px] -translate-x-1/2 items-start gap-3 rounded-md bg-red-900/80 px-4 py-2 text-[11px] text-red-100 shadow-lg">
          <span className="text-red-300">⚠</span>
          <span className="flex-1 whitespace-pre-wrap break-words">
            {error}
          </span>
          <button
            onClick={clearError}
            className="shrink-0 text-red-300 hover:text-red-100"
            aria-label="에러 닫기"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <IdeaProvider>
      <PageInner />
    </IdeaProvider>
  );
}
