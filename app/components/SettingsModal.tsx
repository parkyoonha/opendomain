"use client";

import { useEffect, useState } from "react";
import { useIdea } from "../state/IdeaContext";

export default function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    userGeminiKey,
    setUserGeminiKey,
    useUserKey,
    setUseUserKey,
  } = useIdea();
  const [draft, setDraft] = useState(userGeminiKey ?? "");

  useEffect(() => {
    if (settingsOpen) setDraft(userGeminiKey ?? "");
  }, [settingsOpen, userGeminiKey]);

  if (!settingsOpen) return null;

  const hasKey = Boolean(userGeminiKey && userGeminiKey.length > 0);
  const tier: "free" | "paid" = hasKey && useUserKey ? "free" : "paid";

  const close = () => setSettingsOpen(false);

  const save = () => {
    setUserGeminiKey(draft.trim().length > 0 ? draft : null);
    close();
  };

  const clear = () => {
    setDraft("");
    setUserGeminiKey(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/20 bg-bg-menu p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              설정
            </div>
            <h2 className="mt-0.5 text-[14px] font-semibold text-text-primary">
              AI 모델 · API 키
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="닫기"
            className="rounded-md p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
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

        <div className="mb-4 flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            현재 티어
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              tier === "free"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/20 text-text-primary"
            }`}
          >
            {tier === "free"
              ? "무료 · Gemini 2.5 Flash"
              : "유료 · Claude Haiku 4.5"}
          </span>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-md border border-white/15 bg-black/40 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[11px] text-text-primary">
              무료 티어 사용 (내 Gemini 키)
            </div>
            <div className="text-[10px] text-text-muted">
              {hasKey
                ? "OFF로 두면 키는 유지된 채 유료(Claude)로 전환됩니다"
                : "먼저 아래에 Gemini 키를 입력하세요"}
            </div>
          </div>
          <button
            onClick={() => setUseUserKey(!useUserKey)}
            disabled={!hasKey}
            aria-label="무료 티어 토글"
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              useUserKey && hasKey
                ? "bg-emerald-500/70"
                : "bg-white/15"
            } disabled:opacity-40`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                useUserKey && hasKey ? "left-4" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-text-secondary">
            내 Gemini API 키 (BYOK 무료 이용)
          </label>
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-md border border-white/20 bg-transparent px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/60"
          />
          <p className="text-[10px] leading-4 text-text-muted">
            키는 이 브라우저의 localStorage에만 저장되고, 매 요청 시 헤더로만 서버를 거쳐 Google에 직접 전달됩니다.
            <br />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-primary"
            >
              Google AI Studio에서 무료 발급 →
            </a>
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={clear}
            className="rounded-md border border-white/20 px-3 py-1.5 text-[11px] text-text-secondary hover:border-white/50 hover:text-text-primary"
          >
            키 지우기
          </button>
          <button
            onClick={save}
            className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:opacity-90"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
