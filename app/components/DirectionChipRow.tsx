"use client";

import { useState } from "react";
import {
  directionsForAxis,
  kBuiltinDirections,
  type ThinkingAxis,
  type ThinkingDirection,
} from "@/lib/directions";

export default function DirectionChipRow({
  axis = "decompose",
  currentDirection,
  customDirections,
  onChangeDirection,
  addCustomDirection,
  removeCustomDirection,
  collapsed = false,
  onCollapseChange,
  hideLabel = false,
}: {
  // Which axis the row is driving. Expansion filters out decompose-only
  // directions and vice versa, so the user only sees chips that produce
  // meaningful output in the current mode.
  axis?: ThinkingAxis;
  currentDirection: string;
  customDirections: ThinkingDirection[];
  onChangeDirection: (id: string) => void;
  addCustomDirection: (label: string) => void;
  removeCustomDirection: (id: string) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
  // Skip the row's own "사고 방향" label — used by accordion wrappers
  // that render their own header above the chip grid.
  hideLabel?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const all: ThinkingDirection[] = directionsForAxis(axis, customDirections);
  // currentLabel lookup should fall back across the full set — the user
  // may have a selection that was once valid for the previous axis but
  // isn't filtered in now; the label still comes from the global list.
  const currentLabel =
    [...kBuiltinDirections, ...customDirections].find(
      (d) => d.id === currentDirection,
    )?.label ?? currentDirection;

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          사고 방향
        </span>
        <button
          type="button"
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
      {!hideLabel && (
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          사고 방향
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {all.map((d) => {
          const active = d.id === currentDirection;
          return (
            <span key={d.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => pick(d.id)}
                className={`rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px] ${
                  active
                    ? "bg-white/[0.22] text-text-primary"
                    : "bg-black text-text-muted hover:bg-white/[0.1] hover:text-text-primary"
                }`}
              >
                {d.label}
              </button>
              {d.isCustom && (
                <button
                  type="button"
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
          // Not a <form> on purpose: this row renders inside the
          // InputBar's outer <form>, and nested forms are illegal in
          // HTML — the inner form flattens and a type="submit" inside
          // would fire the OUTER InputBar submit (runDecompose). Use a
          // div + explicit button + enter-key handler instead.
          <div className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!newLabel.trim()) return;
                  addCustomDirection(newLabel);
                  setNewLabel("");
                  setAdding(false);
                }
              }}
              onBlur={() => setAdding(false)}
              placeholder="새 방향"
              className="w-32 rounded-full bg-white/[0.06] px-5 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-white/[0.12] md:w-24 md:px-3 md:py-1 md:text-[11px]"
            />
            {/* mousedown preventDefault keeps the input focused while
                the click registers — without it the input blurs first
                and sets adding=false before the click handler fires. */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!newLabel.trim()) return;
                addCustomDirection(newLabel);
                setNewLabel("");
                setAdding(false);
              }}
              aria-label="추가"
              className="rounded-full bg-white/[0.18] px-3 py-2 text-[14px] text-text-primary hover:bg-white/[0.26] md:px-2 md:py-1 md:text-[11px]"
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            type="button"
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
