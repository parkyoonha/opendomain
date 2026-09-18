"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { kBigCategories, type BigCategory } from "@/lib/constants";

const CHIP_BASE =
  "rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px]";
const CHIP_ACTIVE = "bg-white/[0.18] text-text-primary";
const CHIP_INACTIVE =
  "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary";

export default function ResultTypeChipRow({
  value,
  onChange,
  collapsed = false,
  onCollapseChange,
}: {
  value: BigCategory | null;
  onChange: (v: BigCategory | null) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
}) {
  const { customResultTypes, addCustomResultType, removeCustomResultType } =
    useIdea();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          실행 결과
        </span>
        <button
          onClick={() => onCollapseChange?.(false)}
          className={`${CHIP_BASE} ${CHIP_ACTIVE}`}
        >
          {value ?? "없음"}
        </button>
      </div>
    );
  }

  const pick = (v: BigCategory | null) => {
    onChange(v);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
        실행 결과
      </span>
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => pick(null)}
          className={`${CHIP_BASE} ${value === null ? CHIP_ACTIVE : CHIP_INACTIVE}`}
        >
          없음
        </button>
        {kBigCategories.map((cat) => {
          const active = cat === value;
          return (
            <button
              key={cat}
              onClick={() => pick(cat)}
              className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
            >
              {cat}
            </button>
          );
        })}
        {customResultTypes.map((label) => {
          const active = label === value;
          return (
            <span key={label} className="inline-flex items-center">
              <button
                onClick={() => pick(label as BigCategory)}
                className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
              >
                {label}
              </button>
              <button
                onClick={() => removeCustomResultType(label)}
                className="ml-0.5 text-[10px] text-text-muted hover:text-text-primary"
                aria-label="실행결과 삭제"
              >
                ×
              </button>
            </span>
          );
        })}
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newLabel.trim()) return;
              addCustomResultType(newLabel);
              setNewLabel("");
              setAdding(false);
            }}
            className="inline-flex"
          >
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onBlur={() => setAdding(false)}
              placeholder="새 실행결과"
              className="w-32 rounded-full bg-white/[0.06] px-5 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-white/[0.12] md:w-24 md:px-3 md:py-1 md:text-[11px]"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-white/[0.04] px-5 py-2 text-[14px] text-text-muted hover:bg-white/[0.1] hover:text-text-primary md:px-3 md:py-1 md:text-[11px]"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
