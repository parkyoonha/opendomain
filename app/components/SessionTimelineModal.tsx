"use client";

import { useIdea, type ActivityEntry } from "../state/IdeaContext";

const kindLabel: Record<ActivityEntry["kind"], string> = {
  topic: "주제",
  chip: "칩 검색",
  combine: "조합",
  memo: "메모",
};

const kindColor: Record<ActivityEntry["kind"], string> = {
  topic: "bg-sky-500/20 text-sky-200",
  chip: "bg-violet-500/20 text-violet-200",
  combine: "bg-emerald-500/20 text-emerald-200",
  memo: "bg-amber-500/20 text-amber-200",
};

// Full-screen session timeline. Opens from the controller bar's
// bottom-right expand button and lists this session's selected axes +
// chip combinations in chronological order. Each entry has a 메모
// shortcut so the detail-level actions (previously on the parent-facet
// ⋯ menu) live here.
export default function SessionTimelineModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activityLog, addMemo } = useIdea();

  if (!open) return null;

  // Oldest first so the user reads the session top-to-bottom.
  const items = [...activityLog].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="pt-safe-8 safe-bottom fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="text-[14px] font-semibold text-text-primary">
          세션 타임라인
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-md p-2 text-text-secondary hover:bg-white/10 hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <p className="mt-16 text-center text-[13px] text-text-muted">
            아직 쌓인 선택이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-lg bg-white/[0.05] p-3"
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${kindColor[entry.kind]}`}
                >
                  {kindLabel[entry.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-text-primary">
                    {entry.title}
                  </div>
                  {entry.subtitle && (
                    <div className="mt-0.5 truncate text-[11px] text-text-muted">
                      {entry.subtitle}
                    </div>
                  )}
                  <div className="mt-0.5 text-[10px] text-text-muted">
                    {new Date(entry.createdAt).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const line = entry.subtitle
                      ? `${entry.title} — ${entry.subtitle}`
                      : entry.title;
                    addMemo(line);
                  }}
                  className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1 text-[11px] text-text-primary hover:bg-white/[0.16]"
                >
                  메모
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
