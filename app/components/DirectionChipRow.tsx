"use client";

import { useState } from "react";
import { kBuiltinDirections, type ThinkingDirection } from "@/lib/directions";

export default function DirectionChipRow({
  currentDirection,
  customDirections,
  onChangeDirection,
  addCustomDirection,
  removeCustomDirection,
  collapsed = false,
  onCollapseChange,
}: {
  currentDirection: string;
  customDirections: ThinkingDirection[];
  onChangeDirection: (id: string) => void;
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const all: ThinkingDirection[] = [
    ...kBuiltinDirections,
    ...customDirections,
  ];
  const currentLabel =
    all.find((d) => d.id === currentDirection)?.label ?? currentDirection;

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          사고 방향
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

  const pick = (id: string) => {
    onChangeDirection(id);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
        사고 방향
      </span>
      <div className="flex flex-wrap gap-1">
        {all.map((d) => {
          const active = d.id === currentDirection;
          return (
            <span key={d.id} className="inline-flex items-center">
              <button
                onClick={() => pick(d.id)}
                className={`rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px] ${
                  active
                    ? "bg-white/[0.18] text-text-primary"
                    : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary"
                }`}
              >
                {d.label}
              </button>
              {d.isCustom && (
                <button
                  onClick={() => removeCustomDirection(d.id)}
                  className="ml-0.5 text-[10px] text-text-muted hover:text-text-primary"
                  aria-label="방향 삭제"
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
              addCustomDirection(newLabel);
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
              placeholder="새 방향"
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
