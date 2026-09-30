"use client";

import { kVerifyEvaluations } from "@/lib/verify";

export default function VerifyEvalChipRow({
  currentEvalId,
  onChangeEval,
  collapsed = false,
  onCollapseChange,
}: {
  currentEvalId: string;
  onChangeEval: (id: string) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
}) {
  const currentLabel =
    kVerifyEvaluations.find((e) => e.id === currentEvalId)?.label ??
    currentEvalId;

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          평가 축
        </span>
        <button
          onClick={() => onCollapseChange?.(false)}
          className="rounded-full bg-white/[0.18] px-5 py-2 text-[14px] text-text-primary whitespace-nowrap md:px-3 md:py-1 md:text-[11px]"
        >
          {currentLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
        평가 축
      </span>
      <div className="flex flex-wrap gap-1">
        {kVerifyEvaluations.map((e) => {
          const active = e.id === currentEvalId;
          return (
            <button
              key={e.id}
              onClick={() => onChangeEval(e.id)}
              className={`rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px] ${
                active
                  ? "bg-white/[0.18] text-text-primary"
                  : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary"
              }`}
            >
              {e.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
