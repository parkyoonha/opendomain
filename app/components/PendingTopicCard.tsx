"use client";

import { useState } from "react";
import { useIdea } from "../state/IdeaContext";
import DirectionChipRow from "./DirectionChipRow";
import FacetLensRow from "./FacetLensRow";
import ResultTypeChipRow from "./ResultTypeChipRow";
import VerifyMethodChipRow from "./VerifyMethodChipRow";
import VerifyEvalChipRow from "./VerifyEvalChipRow";
import {
  DEFAULT_VERIFY_METHOD_ID,
  DEFAULT_VERIFY_EVAL_ID,
  verifyMethodLabel,
  verifyEvalLabel,
} from "@/lib/verify";
import { lensLabel } from "@/lib/lenses";

export default function PendingTopicCard() {
  const {
    pendingTopic,
    cancelPending,
    commitPending,
    topicPurposeId,
    topicDirectionId,
    setTopicDirectionId,
    topicResultType,
    setTopicResultType,
    customDirections,
    addCustomDirection,
    removeCustomDirection,
    selectedLens,
    setSelectedLens,
    status,
    principleControllerMode,
    setPrincipleControllerMode,
    principleVerifyMethod,
    setPrincipleVerifyMethod,
    principleVerifyEval,
    setPrincipleVerifyEval,
    principleVerifyLens,
    setPrincipleVerifyLens,
    principleCustomContext,
    setPrincipleCustomContext,
    verifyDerived,
    verifyDerivedStatus,
    runVerifyFacet,
  } = useIdea();
  const [collapsedDir, setCollapsedDir] = useState(false);
  const [collapsedLens, setCollapsedLens] = useState(true);
  const [collapsedResult, setCollapsedResult] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  if (!pendingTopic) return null;

  const busy = status === "loading";
  // Stable pk so verify state follows the current pending topic string.
  const pk = `주제::${pendingTopic}`;
  const mode = principleControllerMode[pk] ?? "explore";
  const customContext = principleCustomContext[pk] ?? "";
  const vMethod = principleVerifyMethod[pk] ?? DEFAULT_VERIFY_METHOD_ID;
  const vEval = principleVerifyEval[pk] ?? DEFAULT_VERIFY_EVAL_ID;
  const vLens = principleVerifyLens[pk] ?? null;
  const vGens = verifyDerived[pk] ?? [];

  return (
    <div className="decomp-controller mb-3 flex w-[calc(100vw-3rem)] max-w-full flex-col gap-3 rounded-lg bg-white/[0.05] p-4 md:w-[560px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
            주제
          </div>
          <h1 className="mt-0.5 whitespace-pre-wrap break-words text-[15px] font-bold text-text-primary">
            {pendingTopic}
          </h1>
        </div>
        <button
          onClick={cancelPending}
          aria-label="취소"
          className="shrink-0 rounded-md p-1 text-text-muted hover:bg-white/10 hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full bg-white/[0.06] p-0.5">
        {(["explore", "verify"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setPrincipleControllerMode(pk, m)}
              className={`rounded-full px-4 py-1 text-[12px] transition-colors md:px-3 md:text-[10px] ${
                active
                  ? "bg-white text-black"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m === "explore" ? "사고확장" : "증명"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] uppercase tracking-wider text-text-muted md:text-[10px]">
          추가 조건 (선택)
        </span>
        <input
          value={customContext}
          onChange={(e) => setPrincipleCustomContext(pk, e.target.value)}
          placeholder="주제를 조율할 추가 조건·관점·제약"
          className="rounded-full bg-white/[0.12] px-4 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none md:text-[12px]"
        />
      </div>

      {mode === "explore" ? (
        <div className="flex flex-col gap-3 pt-1">
          <DirectionChipRow
            currentDirection={topicDirectionId}
            customDirections={customDirections}
            onChangeDirection={setTopicDirectionId}
            addCustomDirection={addCustomDirection}
            removeCustomDirection={removeCustomDirection}
            collapsed={collapsedDir}
            onCollapseChange={setCollapsedDir}
          />
          <FacetLensRow
            currentLens={selectedLens}
            onChangeLens={setSelectedLens}
            collapsed={collapsedLens}
            onCollapseChange={setCollapsedLens}
          />
          <ResultTypeChipRow
            value={topicResultType}
            onChange={setTopicResultType}
            collapsed={collapsedResult}
            onCollapseChange={setCollapsedResult}
          />
          <button
            onClick={() => void commitPending(topicPurposeId)}
            disabled={busy}
            className="mt-2 hidden items-center justify-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black transition-opacity disabled:opacity-30 md:flex"
          >
            <span>분해 시작</span>
            {busy ? <Spinner /> : <Arrow />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <VerifyMethodChipRow
            currentMethodId={vMethod}
            onChangeMethod={(id) => setPrincipleVerifyMethod(pk, id)}
            collapsed={collapsedDir}
            onCollapseChange={setCollapsedDir}
          />
          <FacetLensRow
            currentLens={vLens}
            onChangeLens={(l) => setPrincipleVerifyLens(pk, l)}
            collapsed={collapsedLens}
            onCollapseChange={setCollapsedLens}
          />
          <VerifyEvalChipRow
            currentEvalId={vEval}
            onChangeEval={(id) => setPrincipleVerifyEval(pk, id)}
            collapsed={collapsedResult}
            onCollapseChange={setCollapsedResult}
          />
          <button
            onClick={async () => {
              setVerifyBusy(true);
              try {
                await runVerifyFacet(
                  "주제",
                  pendingTopic,
                  pendingTopic,
                  vMethod,
                  vEval,
                  vLens,
                );
              } finally {
                setVerifyBusy(false);
              }
            }}
            disabled={verifyBusy}
            className="mt-2 hidden items-center justify-center gap-1.5 self-start rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-black transition-opacity hover:bg-amber-300 disabled:opacity-30 md:flex"
          >
            <span>증명 시작</span>
            {verifyBusy ? <Spinner /> : <Arrow />}
          </button>

          {vGens.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {vGens.map((v) => {
                const st = verifyDerivedStatus[v.key];
                return (
                  <div key={v.key} className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center rounded-full border border-amber-400/70 bg-amber-500/25 px-2.5 py-0.5 text-[10px] font-medium text-amber-100">
                      증명 · {verifyMethodLabel(v.methodId)} ·{" "}
                      {lensLabel(v.lens)} · {verifyEvalLabel(v.evalId)}
                    </span>
                    {st === "loading" && (
                      <div className="text-[10px] text-text-muted">검증 중…</div>
                    )}
                    {st === "error" && (
                      <div className="text-[10px] text-red-400">검증 실패</div>
                    )}
                    <ul className="flex flex-col gap-1">
                      {Object.entries(v.subFacets).map(([n, t]) => (
                        <li
                          key={n}
                          className="rounded-md bg-white/[0.06] px-3 py-2"
                        >
                          <div className="text-[12px] font-semibold text-text-primary md:text-[11px]">
                            {n}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-5 text-text-secondary md:text-[10px] md:leading-4">
                            {t}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5 animate-spin"
      aria-label="진행 중"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
