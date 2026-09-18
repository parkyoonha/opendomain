"use client";

import { useEffect, useState } from "react";
import { useIdea, type UserChipKind } from "../state/IdeaContext";
import { chipKindLabel } from "@/lib/constants";

const kindOptions: { kind: UserChipKind; label: string; hint: string }[] = [
  { kind: "industry", label: chipKindLabel.industry, hint: "산업/문화 사례" },
  { kind: "psychology", label: chipKindLabel.psychology, hint: "심리/행동 원리" },
  { kind: "object", label: chipKindLabel.object, hint: "사물/물성" },
  { kind: "memo", label: "메모", hint: "일반 메모" },
];

export default function ChipifyCard() {
  const { chipifyPending, cancelChipify, saveChipify } = useIdea();
  const [kind, setKind] = useState<UserChipKind>("memo");
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");

  useEffect(() => {
    if (chipifyPending) {
      setName("");
      setDefinition(chipifyPending.text);
    }
  }, [chipifyPending]);

  if (!chipifyPending) return null;

  const canSave = name.trim().length > 0 || definition.trim().length > 0;

  return (
    <div className="flex h-full w-full flex-col">
      <div>
        <label
          htmlFor="chipify-name"
          className="text-[10px] uppercase tracking-wider text-text-muted"
        >
          칩명
        </label>
        <input
          id="chipify-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="칩의 이름 (예: 인정욕구)"
          className="mt-1 w-full rounded-md bg-white/[0.06] px-3 py-2 text-[14px] font-semibold text-text-primary placeholder:text-text-muted focus:bg-white/[0.1] focus:outline-none"
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <label
          htmlFor="chipify-definition"
          className="text-[10px] uppercase tracking-wider text-text-muted"
        >
          칩 내용 · 정의
        </label>
        <textarea
          id="chipify-definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="이 칩이 무엇을 뜻하는지 설명"
          className="mt-1 min-h-0 flex-1 resize-none rounded-md bg-white/[0.06] px-3 py-2 text-[13px] leading-6 text-text-primary placeholder:text-text-muted focus:bg-white/[0.1] focus:outline-none"
        />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-text-muted">
          라이브러리 폴더 선택
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kindOptions.map((opt) => {
            const active = kind === opt.kind;
            return (
              <button
                key={opt.kind}
                onClick={() => setKind(opt.kind)}
                title={opt.hint}
                className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={cancelChipify}
          className="rounded bg-white/[0.06] px-3 py-1.5 text-[11px] text-text-secondary hover:bg-white/[0.12] hover:text-text-primary"
        >
          취소
        </button>
        <button
          onClick={() => saveChipify({ kind, name, definition })}
          disabled={!canSave}
          className="rounded bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white/90 disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </div>
  );
}
