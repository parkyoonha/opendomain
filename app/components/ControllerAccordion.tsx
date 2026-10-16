"use client";

import type { ReactNode } from "react";

// Single accordion section used across controller cards (PendingTopicCard,
// axis-level, principle-level). The whole header row is clickable:
// label + selected-chip tag on the left, chevron on the right. The
// parent owns openCategory state so only one section is open at a time.
export default function ControllerAccordion({
  label,
  tag,
  open,
  onToggle,
  children,
}: {
  label: string;
  tag: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/[0.05]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[12px] uppercase tracking-wider text-text-muted md:text-[10px]">
            {label}
          </span>
          <span className="truncate rounded-full bg-white/[0.14] px-2.5 py-0.5 text-[12px] text-text-primary md:text-[11px]">
            {tag}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
