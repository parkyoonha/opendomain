"use client";

import { useState } from "react";
import InputBar from "./components/InputBar";
import TopicChipsBar from "./components/TopicChipsBar";
import DecompositionTree from "./components/DecompositionTree";
import ChipSidePanel from "./components/ChipSidePanel";
import SettingsModal from "./components/SettingsModal";
import BusinessInfoModal from "./components/BusinessInfoModal";
import MemoSidebar from "./components/MemoSidebar";
import LoginModal from "./components/LoginModal";
import AuthMenu from "./components/AuthMenu";
import BottomMenuSheet from "./components/BottomMenuSheet";
import DesktopMenuButton from "./components/DesktopMenuButton";
import { IdeaProvider, useIdea } from "./state/IdeaContext";

function PageInner() {
  const {
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
    loginModalOpen,
    setLoginModalOpen,
  } = useIdea();
  const isFreeTier = Boolean(userGeminiKey) && useUserKey;
  const showChipPanel = chipPanelOpen;
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const inSplit = Boolean(splitMemoPageId) && inputMode === "topic";
  const canGoBack = inputMode === "memo" && !memoListMode;
  const chipAsBottomSheet =
    showChipPanel && !inSplit && inputMode === "topic";

  return (
    <div className="relative flex h-full w-full bg-black">
      <button
        onClick={() => setChipPanelOpen(!showChipPanel)}
        aria-label={showChipPanel ? "칩 패널 닫기" : "칩 패널 열기"}
        title={showChipPanel ? "칩 검색 패널 닫기" : "칩 검색 패널 열기"}
        style={
          showChipPanel
            ? { left: "calc(20rem + 0.75rem)" }
            : undefined
        }
        className={`safe-top-offset absolute z-30 hidden h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:text-text-primary md:flex ${
          showChipPanel
            ? "bg-white/[0.16] text-text-primary"
            : "left-3 bg-white/[0.08] hover:bg-white/[0.16]"
        }`}
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
      <DesktopMenuButton onOpenBusinessInfo={() => setBusinessInfoOpen(true)} />
      <>
          {showChipPanel && (
            <div
              className={
                chipAsBottomSheet
                  ? "bottom-safe-14 safe-bottom absolute inset-x-0 top-1/2 z-40 flex bg-neutral-900 shadow-2xl md:relative md:inset-auto md:bottom-auto md:z-auto md:h-full md:w-80 md:flex-none md:bg-transparent md:shadow-none"
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
            className={`min-w-0 flex-1 flex-col overflow-hidden bg-black pb-safe-14 pt-safe-8 md:pb-0 md:pt-12 ${
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
            {inputMode !== "memo" && <TopicChipsBar />}
            <DecompositionTree />
          </main>
          {inSplit && (
            <div
              className={`${
                activeSplitView === "memo" ? "flex" : "hidden"
              } h-full min-w-0 flex-1 pb-safe-14 pt-safe-16 md:flex md:flex-none md:pb-0 md:pt-12`}
            >
              <MemoSidebar />
            </div>
          )}
          <nav className="safe-bottom absolute inset-x-0 bottom-0 z-30 flex bg-neutral-900 md:hidden">
            {(
              [
                { key: "topic", label: "사고확장" },
                { key: "memo", label: "메모" },
                { key: "chip", label: "칩" },
                { key: "menu", label: "메뉴" },
              ] as const
            ).map((t) => {
              const active =
                t.key === "menu"
                  ? bottomMenuOpen
                  : inSplit
                    ? activeSplitView === t.key
                    : t.key === "chip"
                      ? showChipPanel
                      : !showChipPanel && inputMode === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.key === "menu") {
                      setBottomMenuOpen((v) => !v);
                      return;
                    }
                    if (bottomMenuOpen) setBottomMenuOpen(false);
                    if (t.key === "chip") {
                      if (showChipPanel && !inSplit) {
                        setChipPanelOpen(false);
                        return;
                      }
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
      <AuthMenu />
      <BottomMenuSheet
        open={bottomMenuOpen}
        onClose={() => setBottomMenuOpen(false)}
        onOpenBusinessInfo={() => setBusinessInfoOpen(true)}
      />
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
      <SettingsModal />
      <BusinessInfoModal
        open={businessInfoOpen}
        onClose={() => setBusinessInfoOpen(false)}
      />
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
