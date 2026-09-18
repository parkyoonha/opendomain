"use client";

import { useIdea, type ActivityEntry } from "../state/IdeaContext";

const kindLabel: Record<ActivityEntry["kind"], string> = {
  topic: "주제",
  chip: "칩검색",
  memo: "메모",
  combine: "조합",
};

export default function ActivityPanel() {
  const { activityLog, openActivity, setActivityPanelOpen } = useIdea();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-white/10 bg-black">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            활동 내역
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-text-primary">
            {activityLog.length}개
          </div>
        </div>
        <button
          onClick={() => setActivityPanelOpen(false)}
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
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {activityLog.length === 0 ? (
          <p className="px-1 text-[11px] text-text-muted">
            아직 활동이 없습니다
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {activityLog.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => void openActivity(a)}
                  disabled={!a.payload}
                  title={a.subtitle}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md bg-bg-main px-2.5 py-2 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
                    <span>{kindLabel[a.kind]}</span>
                    {a.subtitle && (
                      <span className="normal-case tracking-normal">
                        · {a.subtitle}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-primary line-clamp-2">
                    {a.title}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
