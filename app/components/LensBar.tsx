"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import { kBuiltinLenses, lensLabel } from "@/lib/lenses";

const MY_LENS = "내렌즈";

export default function LensBar() {
  const {
    selectedLens,
    setSelectedLens,
    customLenses,
    addCustomLens,
    removeCustomLens,
    addCustomScholar,
    removeCustomScholar,
  } = useIdea();

  const [expanded, setExpanded] = useState(false);
  const [openDiscipline, setOpenDiscipline] = useState<string | null>(null);
  const [showAddLens, setShowAddLens] = useState(false);
  const [newLensName, setNewLensName] = useState("");
  const [newScholar, setNewScholar] = useState<Record<string, string>>({});

  const disciplines = [
    { discipline: MY_LENS, scholars: [], isCustom: true as const },
    ...customLenses.map((l) => ({ ...l, isCustom: true as const })),
    ...kBuiltinLenses.map((l) => ({ ...l, isCustom: false as const })),
  ];

  const isActiveDiscipline = (d: string) => selectedLens?.discipline === d;

  const applyLens = (
    discipline: string,
    scholar: string | null,
    isCustom: boolean,
  ) => {
    setSelectedLens({ discipline, scholar, isCustom });
  };

  const toggleDiscipline = (name: string) => {
    setOpenDiscipline((cur) => (cur === name ? null : name));
  };

  const chipClass = (opts: {
    active?: boolean;
    isMyLens?: boolean;
    dim?: boolean;
    opened?: boolean;
  }) => {
    const { active, isMyLens, dim, opened } = opts;
    if (opened) {
      return "rounded-full border border-white bg-white/10 px-2.5 py-1 text-[14px] md:text-[11px] text-text-primary transition-colors whitespace-nowrap";
    }
    if (active) {
      return "rounded-full border border-white/80 bg-white/15 px-2.5 py-1 text-[14px] md:text-[11px] text-text-primary transition-colors whitespace-nowrap";
    }
    if (isMyLens) {
      return "rounded-full border border-dashed border-white/40 px-2.5 py-1 text-[14px] md:text-[11px] text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap";
    }
    return `rounded-full border border-white/20 px-2.5 py-1 text-[14px] md:text-[11px] transition-colors whitespace-nowrap ${
      dim
        ? "text-text-muted hover:text-text-secondary"
        : "text-text-secondary hover:border-white/50 hover:text-text-primary"
    }`;
  };

  const openedItem = openDiscipline
    ? disciplines.find((d) => d.discipline === openDiscipline) ?? null
    : null;

  return (
    <div className="bg-black px-6 pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setExpanded((v) => !v);
            setOpenDiscipline(null);
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[14px] md:text-[11px] transition-colors ${
            selectedLens
              ? "border-white/70 bg-white/10 text-text-primary"
              : "border-white/30 bg-transparent text-text-muted hover:text-text-secondary"
          }`}
          aria-label="렌즈 선택"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="m20 20-4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{lensLabel(selectedLens)}</span>
          {selectedLens && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLens(null);
              }}
              className="ml-1 text-text-muted hover:text-text-primary"
              aria-label="렌즈 해제"
            >
              ×
            </span>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-2">
          {openedItem ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleDiscipline(openedItem.discipline)}
                className={chipClass({
                  opened: true,
                  isMyLens: openedItem.discipline === MY_LENS,
                })}
              >
                {openedItem.discipline}
              </button>

              {openedItem.discipline === MY_LENS ? (
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {customLenses.length === 0 && (
                      <span className="whitespace-nowrap text-[14px] md:text-[11px] text-text-muted">
                        아래 + 로 렌즈 추가
                      </span>
                    )}
                    {customLenses.map((cl) => (
                      <div
                        key={cl.discipline}
                        className="flex items-center gap-1"
                      >
                        <button
                          onClick={() => applyLens(cl.discipline, null, true)}
                          className={chipClass({
                            active:
                              selectedLens?.discipline === cl.discipline &&
                              !selectedLens?.scholar,
                          })}
                        >
                          {cl.discipline} · 전체
                        </button>
                        {cl.scholars.map((s) => {
                          const active =
                            selectedLens?.discipline === cl.discipline &&
                            selectedLens?.scholar === s;
                          return (
                            <span
                              key={s}
                              className="inline-flex items-center gap-0.5"
                            >
                              <button
                                onClick={() => applyLens(cl.discipline, s, true)}
                                className={chipClass({ active })}
                              >
                                {s}
                              </button>
                              <button
                                onClick={() =>
                                  removeCustomScholar(cl.discipline, s)
                                }
                                className="text-[13px] text-text-muted md:text-[10px] hover:text-text-primary"
                                aria-label="학자 삭제"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                        <ScholarAdder
                          value={newScholar[cl.discipline] ?? ""}
                          onChange={(v) =>
                            setNewScholar((m) => ({ ...m, [cl.discipline]: v }))
                          }
                          onSubmit={() => {
                            const v = newScholar[cl.discipline];
                            if (!v) return;
                            addCustomScholar(cl.discipline, v);
                            setNewScholar((m) => ({
                              ...m,
                              [cl.discipline]: "",
                            }));
                          }}
                          placeholder={`+ ${cl.discipline} 학자`}
                        />
                        <button
                          onClick={() => removeCustomLens(cl.discipline)}
                          className="text-[13px] text-text-muted md:text-[10px] hover:text-text-primary"
                          aria-label="렌즈 삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {showAddLens ? (
                      <ScholarAdder
                        value={newLensName}
                        onChange={setNewLensName}
                        onSubmit={() => {
                          if (!newLensName.trim()) return;
                          addCustomLens(newLensName);
                          setNewLensName("");
                          setShowAddLens(false);
                        }}
                        placeholder="새 렌즈 이름"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setShowAddLens(true)}
                        className="rounded-full border border-dashed border-white/40 px-2.5 py-1 text-[14px] md:text-[11px] text-text-secondary hover:text-text-primary whitespace-nowrap"
                      >
                        + 새 렌즈
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        applyLens(openedItem.discipline, null, openedItem.isCustom)
                      }
                      className={chipClass({
                        active:
                          selectedLens?.discipline === openedItem.discipline &&
                          !selectedLens?.scholar,
                      })}
                    >
                      학문 전체
                    </button>
                    {openedItem.scholars.map((s) => {
                      const active =
                        selectedLens?.discipline === openedItem.discipline &&
                        selectedLens?.scholar === s;
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            applyLens(openedItem.discipline, s, openedItem.isCustom)
                          }
                          className={chipClass({ active })}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {disciplines.map((d) => (
                <button
                  key={d.discipline}
                  onClick={() => toggleDiscipline(d.discipline)}
                  className={chipClass({
                    active: isActiveDiscipline(d.discipline),
                    isMyLens: d.discipline === MY_LENS,
                  })}
                >
                  {d.discipline}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScholarAdder(props: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
      className="inline-flex"
    >
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        className="w-28 rounded-full border border-dashed border-white/40 bg-transparent px-2.5 py-1 text-[14px] md:text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/70"
      />
    </form>
  );
}
