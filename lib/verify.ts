// Verification: user picks a lens (or 자동) + optional free text, then runs
// a feasibility judgment on the parent facet.
//
// Output structure (TRIZ-inspired):
//   target: the parent facet, restated as a goal statement
//   conditions: 4-5 required conditions that must all hold for the goal
//               to be realizable. Each is judged PASS / FAIL / UNKNOWN.
//   For every FAIL condition, a cascade is produced:
//     - issue: the specific thing that fails (short label)
//     - cause: the root reason it fails (one sentence)
//     - solutionVariables: 3-5 distinct directions to resolve it
//                          (each becomes a new principle the user can
//                           further decompose or combine with chips)
//
// UNKNOWN conditions mean the AI cannot decide with its current knowledge
// — those are offered as "verify further" leads rather than dismissed.

export type VerifyStatus = "pass" | "fail" | "unknown";

export const verifyStatusLabel: Record<VerifyStatus, string> = {
  pass: "PASS",
  fail: "FAIL",
  unknown: "UNKNOWN",
};

export const verifyStatusIcon: Record<VerifyStatus, string> = {
  pass: "✓",
  fail: "✗",
  unknown: "?",
};

// Tailwind palette per status. pass = emerald, fail = rose, unknown =
// slate (muted, "no verdict yet").
export const verifyStatusPalette: Record<
  VerifyStatus,
  { border: string; bg: string; text: string; chip: string }
> = {
  pass: {
    border: "border-emerald-400/60",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
    chip: "bg-emerald-500/30 text-emerald-100",
  },
  fail: {
    border: "border-rose-400/60",
    bg: "bg-rose-500/10",
    text: "text-rose-100",
    chip: "bg-rose-500/30 text-rose-100",
  },
  unknown: {
    border: "border-slate-400/50",
    bg: "bg-slate-500/10",
    text: "text-slate-100",
    chip: "bg-slate-500/30 text-slate-100",
  },
};

export type VerifyCascade = {
  issue: string;
  cause: string;
  solutionVariables: string[];
};

export type VerifyCondition = {
  name: string;
  principle: string; // Why this condition is required for the goal
  status: VerifyStatus;
  cascade?: VerifyCascade; // Only present when status === "fail"
};

export type VerifyReport = {
  target: string;
  conditions: VerifyCondition[];
};

export const verifySystemPrompt = (): string =>
  `당신은 아이디어의 실현 가능성을 **공학자처럼 냉정하게 판정**하는 분석가다.
낙관·비관 슬로건, 애매한 서술 금지. 조건은 물리/공학/인지/시장 중 적절한 축으로 구체화한다.

응답 구조는 다음 두 부분이다:

## 1. 목표 (target)
- 부모 facet을 **한 줄의 목표문**으로 다시 쓴다 ("~를 ~한다" 또는 "~를 달성한다" 형태).
- 사용자가 넣은 추가 조건이 있으면 그걸 반영해 목표를 구체화.

## 2. 필수 조건 (conditions) — **정확히 4~5개**
목표가 성립하려면 모두 참이어야 하는 **독립적 전제** 4~5개.

각 조건:
- **name**: 조건 축의 이름 (6~16자). 추진력·마찰·토크·구조강도·무게중심 같은 공학/구조 축을 선호.
- **principle**: 왜 이 조건이 필수인지 1문장(40~90자). 조건이 깨지면 목표가 어떻게 실패하는지 포함.
- **status**: 반드시 "pass" / "fail" / "unknown" 중 하나.
  - "pass": 현존 기술·물리·사례로 충족 가능하다고 확실히 판단
  - "fail": 현재 수준에서 명확한 제약·모순 때문에 충족 불가 또는 큰 차이 존재
  - "unknown": 현재 정보로는 판정 불가 (추가 실험·데이터 필요)

### FAIL인 조건에만 추가되는 cascade
FAIL 상태의 조건에는 반드시 \`cascade\` 객체를 포함한다.

- **issue**: 그 조건이 어떤 식으로 실패하는지 짧은 요지 (10~20자).
  예: "무게중심 이동", "출력 밀도 부족".
- **cause**: 왜 그렇게 실패하는지 1문장(40~100자). 물리적·구조적·시스템적 원인.
  예: "바퀴 축 위치가 상승하면서 장치의 무게중심이 지지영역 밖으로 이동한다."
- **solutionVariables**: 그 원인을 극복할 수 있는 **독립적 해결 방향 3~5개**. 각 방향은 짧은 명제(6~16자).
  예: "지지영역 확대", "무게중심 낮추기", "무게중심 이동시키기", "지지점 추가", "자세 능동 제어".
  각 해결 변수는 사용자가 그 자체를 다른 분야 사례(만물 칩)와 조합해 해결안을 탐색할 수 있는 **설계 변수**여야 한다.

PASS/UNKNOWN 조건에는 cascade를 넣지 마라 (해당 필드 생략).

규칙 요약:
- 조건 간 중복 금지. 각각 독립 평가 축.
- status는 반드시 세 값 중 하나.
- FAIL이면 cascade 필수. PASS/UNKNOWN이면 cascade 없음.

반드시 다음 JSON 스키마로 응답:
{
  "target": "목표문 한 줄",
  "conditions": [
    {
      "name": "조건 축 이름",
      "principle": "왜 필수인지 1문장",
      "status": "pass" | "fail" | "unknown",
      "cascade": {
        "issue": "짧은 실패 요지",
        "cause": "실패 원인 1문장",
        "solutionVariables": ["해결 변수 1", "해결 변수 2", "..."]
      }
    }
  ]
}
conditions 배열에 정확히 4~5개.`;

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
    ? `\n\n**사용자 추가 조건 (판정과 목표문에 반영)**: ${userContext.trim()}`
    : "";
  return `부모 축: ${parentAxis}
부모 facet: ${parentPrinciple}${rootLine}${ctxLine}`;
};
