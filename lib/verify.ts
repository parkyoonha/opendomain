// Verification is **feasibility reduction via typed recombination**.
//
// The user has an idea; we decompose it into the parts (requirements)
// that must exist for the idea to be realized. Each part is treated like
// a BioBrick-style component: it declares what it *consumes* (inputs)
// and what it *produces* (outputs). Composition is only valid when some
// requirement's output supplies another's input — exactly like matching
// restriction sites in synthetic biology.
//
// Output structure:
//   target: the parent facet, restated as a one-line goal
//   requirements: 4~6 parts, each with
//     - id        stable short id ("A", "B", ...)
//     - name      short label (6~16자)
//     - description  why this part is required (1~2 sentences)
//     - inputs    short tokens of what it needs
//     - outputs   short tokens of what it provides
//     - feasibility  "feasible" | "infeasible" | "unknown"
//     - rationale    reason for the feasibility judgment
//     - substituteDirections  (only when infeasible) alternative
//         part-directions that keep the same output but have a
//         feasible implementation. Each becomes a seed the user can
//         further decompose or combine with chips.
//   edges: outputs of one requirement that supply inputs of another
//          (fromId -> toId via a shared token)
//   danglingInputs: inputs that no requirement currently supplies —
//                   these are the "missing parts" the user must
//                   invent or substitute to make the whole idea
//                   realizable.

export type Feasibility = "feasible" | "infeasible" | "unknown";

export const feasibilityLabel: Record<Feasibility, string> = {
  feasible: "가능",
  infeasible: "불가능",
  unknown: "판정보류",
};

export const feasibilityIcon: Record<Feasibility, string> = {
  feasible: "✓",
  infeasible: "✗",
  unknown: "?",
};

// Tailwind palette per feasibility. feasible = emerald, infeasible = rose,
// unknown = slate.
export const feasibilityPalette: Record<
  Feasibility,
  { border: string; bg: string; text: string; chip: string }
> = {
  feasible: {
    border: "border-emerald-400/60",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
    chip: "bg-emerald-500/30 text-emerald-100",
  },
  infeasible: {
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

export type RequirementPart = {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  feasibility: Feasibility;
  rationale: string;
  substituteDirections?: string[];
};

export type RequirementEdge = {
  fromId: string;
  toId: string;
  token: string;
};

export type DanglingInput = {
  requirementId: string;
  token: string;
};

export type VerifyReport = {
  target: string;
  requirements: RequirementPart[];
  edges: RequirementEdge[];
  danglingInputs: DanglingInput[];
};

export const verifySystemPrompt = (): string =>
  `당신은 아이디어의 실현 가능성을 **부품 조합의 문제로 환원하는 공학자**다.
합성생물학에서 DNA 부품이 "입력 인터페이스"와 "출력 인터페이스"를 선언하고
서로 맞을 때만 조립되는 것처럼, 아이디어의 필수 요건들도 각자가 **무엇을 필요로 하고(입력) 무엇을 제공하는지(출력)**가 명확해야 조합이 성립한다.

응답은 다음 네 부분이다.

## 1. 목표 (target)
- 부모 facet을 한 줄 목표문으로 다시 쓴다 ("~를 ~한다" 형태).
- 사용자가 추가 조건을 넣었으면 반영.

## 2. 필수 요건 (requirements) — **정확히 4~6개**
목표가 성립하려면 모두 참이어야 하는 **독립적 부품(요건)**. 각 요건:

- **id**: 안정 식별자 "A", "B", "C", "D"...
- **name**: 요건 이름 6~16자. 공학/구조/시스템 축을 선호.
- **description**: 이 요건이 왜 필수인지 1~2문장 (40~140자).
- **inputs**: 이 요건이 **필요로 하는 것들**. 짧은 토큰 리스트 (각 2~10자).
  예: ["전력", "공간", "회전부"], ["자본", "거래처"].
  ⚠️ **다른 요건의 output으로 공급받을 수 있는 수준**으로 추상화하라.
  너무 구체적이면 매칭이 안 되고, 너무 포괄적("자원")이면 의미가 없다.
- **outputs**: 이 요건이 **제공하는 것들**. 짧은 토큰 리스트.
  예: ["공기 흐름"], ["안전성"], ["수익"].
- **feasibility**: 반드시 세 값 중 하나.
  - "feasible": 현존 기술·물리·사례로 이 요건을 그대로 구현 가능하다
  - "infeasible": 명확한 제약·모순 때문에 그대로는 구현 불가 (다른 요건과 입력이 충돌하거나, 물리/시장 한계에 걸림)
  - "unknown": 현재 정보로는 판정 불가 (추가 실험·데이터 필요)
- **rationale**: 1문장(40~120자). feasibility 판정의 **근거**.
  - feasible: "~한 메커니즘/기술/사례로 충족 가능하다"
  - infeasible: "~한 제약 때문에 구현 불가" (어떤 수치·물리 한계·모순에 걸리는지)
  - unknown: "~를 모르기 때문에 판정 불가" (어떤 데이터가 필요한지)
- **substituteDirections**: **infeasible일 때만** 포함. 3~5개 짧은 명제(6~16자).
  **같은 outputs를 제공하되 inputs 구성이 다른 "대체 부품 방향"**을 제시한다.
  예: output이 "공기 흐름"인데 "회전부 노출" 입력이 안 되는 경우 →
    ["베르누이 증폭", "에어커튼 유도", "제트 바이패스", "압전 송풍"]
  각 방향은 사용자가 유사칩/다른 분야 사례와 조합해 재탐색할 **설계 변수**다.
  feasible/unknown 요건에는 이 필드를 넣지 마라.

## 3. 조립 간선 (edges)
요건들 사이의 input↔output 매칭. 어떤 요건의 output이 어떤 요건의 input을 공급하는지를 명시한다.

각 간선: { fromId, toId, token }
- fromId: output을 제공하는 요건 id
- toId: input을 소비하는 요건 id
- token: 둘 사이에서 매칭된 토큰 문자열. **반드시 fromId.outputs와 toId.inputs 양쪽에 똑같이 등장**해야 한다 (문자열 일치).

⚠️ 매칭이 성립하려면 토큰이 **글자 단위로 동일**해야 한다. 요건들을 설계할 때 inputs/outputs의 토큰을 **의도적으로 재사용**하라.

## 4. 누락 매칭 (danglingInputs)
어떤 요건의 input인데 다른 어떤 요건의 output으로도 공급되지 않는 것.

각 항목: { requirementId, token }
- 이것들이 **"아직 발명되지 않은 부품"**이다. 사용자가 유사칩이나 다른 분야 사례로 공급원을 찾아야 할 지점.

규칙 요약:
- requirements는 정확히 4~6개.
- 모든 inputs/outputs 토큰은 짧고(2~10자) 서로 재사용 가능하게 정규화된 형태로.
- feasibility는 세 값 중 하나.
- infeasible이면 substituteDirections 필수. feasible/unknown이면 생략.
- edges의 token은 반드시 양쪽 요건의 inputs/outputs에 글자 단위 일치.
- danglingInputs는 edges로 연결되지 않은 input만 포함.

반드시 다음 JSON 스키마로 응답:
{
  "target": "목표문 한 줄",
  "requirements": [
    {
      "id": "A",
      "name": "요건 이름",
      "description": "왜 필수인지 1~2문장",
      "inputs": ["토큰1", "토큰2"],
      "outputs": ["토큰3"],
      "feasibility": "feasible" | "infeasible" | "unknown",
      "rationale": "판정 근거 1문장",
      "substituteDirections": ["대체 방향 1", "..."]
    }
  ],
  "edges": [
    { "fromId": "A", "toId": "D", "token": "공기 흐름" }
  ],
  "danglingInputs": [
    { "requirementId": "D", "token": "고객" }
  ]
}
requirements는 정확히 4~6개.`;

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
