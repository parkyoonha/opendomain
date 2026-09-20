"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { kBuiltinLenses, lensLabel, type SelectedLens } from "@/lib/lenses";

const CHIP_BASE =
  "rounded-full px-5 py-2 text-[14px] transition-colors whitespace-nowrap md:px-3 md:py-1 md:text-[11px]";
const CHIP_ACTIVE = "bg-white/[0.18] text-text-primary";
const CHIP_INACTIVE =
  "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary";

export default function FacetLensRow({
  currentLens,
  onChangeLens,
  collapsed = false,
  onCollapseChange,
}: {
  currentLens: SelectedLens | null;
  onChangeLens: (lens: SelectedLens | null) => void;
  collapsed?: boolean;
  onCollapseChange?: (v: boolean) => void;
}) {
  const { customLenses, addCustomLens, removeCustomLens } = useIdea();
  const [openDiscipline, setOpenDiscipline] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const allLenses = [
    ...customLenses.map((l) => ({
      discipline: l.discipline,
      scholars: l.scholars,
      isCustom: true as const,
    })),
    ...kBuiltinLenses.map((l) => ({ ...l, isCustom: false as const })),
  ];

  if (collapsed && currentLens) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          렌즈
        </span>
        <span className={`${CHIP_BASE} ${CHIP_ACTIVE}`}>
          {lensLabel(currentLens)}
        </span>
        <button
          onClick={() => onCollapseChange?.(false)}
          className="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-text-secondary hover:bg-white/[0.14] hover:text-text-primary md:text-[10px]"
        >
          렌즈 변경
        </button>
      </div>
    );
  }

  const toggle = (name: string) =>
    setOpenDiscipline((c) => (c === name ? null : name));

  const opened = openDiscipline
    ? allLenses.find((l) => l.discipline === openDiscipline)
    : null;

  const pick = (lens: SelectedLens | null) => {
    onChangeLens(lens);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          렌즈
        </span>
        {currentLens && !opened && (
          <span className="text-[10px] text-text-muted">
            현재: {lensLabel(currentLens)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {opened ? (
          <>
            <button
              onClick={() => setOpenDiscipline(null)}
              className={`${CHIP_BASE} ${CHIP_ACTIVE}`}
            >
              {opened.discipline}
            </button>
            <button
              onClick={() => {
                pick({ discipline: opened.discipline, scholar: null });
                setOpenDiscipline(null);
              }}
              className={`${CHIP_BASE} ${
                currentLens?.discipline === opened.discipline &&
                !currentLens?.scholar
                  ? CHIP_ACTIVE
                  : CHIP_INACTIVE
              }`}
            >
              학문 전체
            </button>
            {opened.scholars.map((s) => {
              const active =
                currentLens?.discipline === opened.discipline &&
                currentLens?.scholar === s;
              return (
                <button
                  key={s}
                  onClick={() => {
                    pick({ discipline: opened.discipline, scholar: s });
                    setOpenDiscipline(null);
                  }}
                  className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
                >
                  {s}
                </button>
              );
            })}
          </>
        ) : (
          <>
            {allLenses.map((l) => {
              const active = currentLens?.discipline === l.discipline;
              return (
                <span key={l.discipline} className="inline-flex items-center">
                  <button
                    onClick={() => toggle(l.discipline)}
                    className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_INACTIVE}`}
                  >
                    {l.discipline}
                    {active && currentLens?.scholar
                      ? ` · ${currentLens.scholar}`
                      : ""}
                  </button>
                  {l.isCustom && (
                    <button
                      onClick={() => removeCustomLens(l.discipline)}
                      className="ml-0.5 text-[10px] text-text-muted hover:text-text-primary"
                      aria-label="렌즈 삭제"
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
                  addCustomLens(newLabel);
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
                  placeholder="새 렌즈"
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
          </>
        )}
      </div>
    </div>
  );
}
