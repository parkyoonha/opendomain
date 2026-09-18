"use client";

import { useState } from "react";
import { kBuiltinPurposes, type ThinkingPurpose } from "@/lib/purposes";

const CHIP_BASE =
  "rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px]";
const CHIP_ACTIVE = "bg-white/[0.18] text-text-primary";
const CHIP_INACTIVE =
  "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary";

export default function PurposeChipRow({
  currentPurpose,
  customPurposes,
  onChangePurpose,
  addCustomPurpose,
  removeCustomPurpose,
  collapsed = false,
  onCollapseChange,
}: {
  currentPurpose: string;
  customPurposes: ThinkingPurpose[];
  onChangePurpose: (id: string) => void;
  addCustomPurpose: (label: string) => void;
  removeCustomPurpose: (id: string) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const all: ThinkingPurpose[] = [...kBuiltinPurposes, ...customPurposes];
  const currentLabel =
    all.find((p) => p.id === currentPurpose)?.label ?? currentPurpose;

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          사고 목적
        </span>
        <button
          onClick={() => onCollapseChange?.(false)}
          className={`${CHIP_BASE} ${CHIP_ACTIVE}`}
        >
          {currentLabel}
        </button>
      </div>
    );
  }

  const pick = (id: string) => {
    onChangePurpose(id);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        사고 목적
      </span>
      {all.map((p) => {
        const active = p.id === currentPurpose;
        return (
          <span key={p.id} className="inline-flex items-center">
            <button
              onClick={() => pick(p.id)}
              className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
            >
              {p.label}
            </button>
            {p.isCustom && (
              <button
                onClick={() => removeCustomPurpose(p.id)}
                className="ml-0.5 text-[10px] text-text-muted hover:text-text-primary"
                aria-label="목적 삭제"
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newLabel.trim()) return;
            addCustomPurpose(newLabel);
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
            placeholder="새 목적"
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
  );
}
