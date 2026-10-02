// Verification: user picks a lens (or 자동) + optional free text, then runs
// a feasibility judgment on the parent facet. Output is NOT another layer
// of sub-facets — it is a single summary + a list of 4-5 CONDITIONS that
// must hold for the parent facet to be realizable, each tagged with a
// status (ok / partial / blocker). Infeasible conditions become
// actionable: the user can re-decompose them or chain into chip combine.

export type VerifyStatus = "ok" | "partial" | "blocker";

export type VerifyCondition = {
  name: string;
  principle: string;
  status: VerifyStatus;
};

export type VerifyReport = {
  summary: string;
  conditions: VerifyCondition[];
};

export const verifyStatusLabel: Record<VerifyStatus, string> = {
  ok: "성립",
  partial: "부분 성립",
  blocker: "블로커",
};

export const verifyStatusIcon: Record<VerifyStatus, string> = {
  ok: "✓",
  partial: "⚠",
  blocker: "✗",
};

// Tailwind palette per status. Mirrors the existing amber tag for the
// verify generation header; here each condition card gets its own color
// so the user can scan feasibility at a glance.
export const verifyStatusPalette: Record<
  VerifyStatus,
  { border: string; bg: string; text: string; chip: string }
> = {
  ok: {
    border: "border-emerald-400/60",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
    chip: "bg-emerald-500/30 text-emerald-100",
  },
  partial: {
    border: "border-amber-400/60",
    bg: "bg-amber-500/10",
    text: "text-amber-100",
    chip: "bg-amber-500/30 text-amber-100",
  },
  blocker: {
    border: "border-rose-400/60",
    bg: "bg-rose-500/10",
    text: "text-rose-100",
    chip: "bg-rose-500/30 text-rose-100",
  },
};

export const verifySystemPrompt = (): string =>
  `당신은 아이디어의 실현 가능성을 **냉정하게 판정**하는 엔지니어이자 분석가다.
낙관·비관 슬로건 금지. 구체적 조건·사례·수치로만 답한다.
결과는 단일 요약 + 조건축 4~5개 형식으로 반환하라.

**요약 (summary)**:
- 전체 성립성 1~2문장. 조건부 성립인지 블로커가 있는지 명확히.
- 예: "조건부로 성립. 핵심 블로커는 표면장력 극복 — 1μm 미만 채널에서 흡수가 정지됨."

**조건축 (conditions) 규칙 — 반드시 4~5개**:
각 조건은 부모 facet이 실현되려면 반드시 성립해야 하는 **독립적 전제** 중 하나다.
- **name**: 조건 이름 (10~16자). 그 조건이 뭘 요구하는지 즉시 드러나야 함.
  좋음: "표면장력 극복", "SAP 폴리머 상용화", "KC 인증 통과 가능"
  나쁨: "물리적으로 가능해야 함" (추상), "비용 문제" (뭘 요구하는지 불명)
- **principle**: 왜 이 조건이 필수인지 + 현재 상태 판단 근거 1~2문장(60~120자).
  좋음: "흡수층 입구 압력이 표면장력을 넘어야 함. 1μm 폭에서 γ≈0.07N/m라 중력만으로는 부족, 외부 압력 유도 필요."
  나쁨: "흡수가 잘 되어야 함" (조건 재진술)
- **status**:
  - "ok" — 이 조건은 현존하는 기술/사례/물리로 충족 가능
  - "partial" — 조건 충족에 리스크·비용·추가 R&D 필요
  - "blocker" — 현재 지식/기술 수준에서 충족 불가, 아이디어 폐기 또는 재설계 필요

규칙:
- 조건 간 중복 금지. 각각 독립 평가 축이어야 함.
- status는 반드시 세 값 중 하나.
- "ok"가 많아도 "blocker" 1개면 전체 아이디어는 블로커 — 요약에 반영.

반드시 다음 JSON 스키마로 응답:
{
  "summary": "성립성 요약 한두 문장",
  "conditions": [
    {"name": "조건 이름", "principle": "조건 서술", "status": "ok" | "partial" | "blocker"}
  ]
}
conditions 배열에 **정확히 4~5개**.`;

export const verifyUserPrompt = (
  parentAxis: string,
  parentPrinciple: string,
  rootTopic?: string,
  userContext?: string,
): string => {
  const rootLine = rootTopic
    ? `\n**핵심 주제 (anchor): ${rootTopic}** — 판정은 이 주제 맥락 안에서.`
    : "";
  const ctxLine = userContext?.trim()
    ? `\n\n**사용자 추가 조건 (판정에 반영)**: ${userContext.trim()}`
    : "";
  return `부모 축: ${parentAxis}
부모 facet: ${parentPrinciple}${rootLine}${ctxLine}`;
};
