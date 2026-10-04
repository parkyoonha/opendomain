// Verification is **feasibility reduction via typed recombination**.
//
// The user has an idea; we decompose it into the parts (requirements)
// that must exist for the idea to be realized. Each part is treated like
// a BioBrick-style component: it declares what it *needs* and what it
// *provides*. Composition is only valid when some requirement's provides
// supplies another's needs — exactly like matching restriction sites in
// synthetic biology.
//
// Requirements are organized into **three composition tiers** so the
// user reads a flow (base → junction → finish) rather than an
// alphabetical list:
//   기반 (base)   — needs are all external; provides outputs for others
//   결합 (junction) — consumes some provides + supplies more
//   완성 (finish) — produces an output that satisfies the target goal
//
// Output structure:
//   target: the parent facet, restated as a one-line goal
//   requirements: 4~6 parts, each with
//     - id        stable short id (used only for edges/dangling refs)
//     - tier      기반 | 결합 | 완성
//     - name      short label (6~16자)
//     - description  why this part is required (1~2 sentences)
//     - needs     short tokens of what it consumes
//     - provides  short tokens of what it produces
//     - feasibility  feasible | infeasible | unknown
//     - rationale    reason for the feasibility judgment
//     - substituteDirections  (only when infeasible) alternative
//         part-directions that keep the same provides but with a
//         feasible needs set.
//   edges: provides of one requirement that supply needs of another
//   danglingNeeds: needs that no requirement currently supplies —
//                  the "missing parts" the user must invent/substitute.

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

// Palette: match 사고확장 axis card style — background tint only, no
// outline border. Feasibility is still conveyed via the inner `chip`
// badge in each requirement card.
export const feasibilityPalette: Record<
  Feasibility,
  { bg: string; text: string; chip: string }
> = {
  feasible: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
    chip: "bg-emerald-500/30 text-emerald-100",
  },
  infeasible: {
    bg: "bg-rose-500/10",
    text: "text-rose-100",
    chip: "bg-rose-500/30 text-rose-100",
  },
  unknown: {
    bg: "bg-slate-500/10",
    text: "text-slate-100",
    chip: "bg-slate-500/30 text-slate-100",
  },
};

export type RequirementTier = "기반" | "결합" | "완성";

export const kRequirementTiers: readonly RequirementTier[] = [
  "기반",
  "결합",
  "완성",
] as const;

export const tierDescription: Record<RequirementTier, string> = {
  기반: "외부에서만 필요를 받고, 다른 요건에 산출을 공급",
  결합: "다른 요건의 산출을 받아 변환해 또 다른 산출을 만듦",
  완성: "최종 산출이 목표 자체를 직접 만족",
};

export const tierBadgePalette: Record<RequirementTier, string> = {
  기반: "bg-sky-500/15 text-sky-100",
  결합: "bg-violet-500/15 text-violet-100",
  완성: "bg-amber-500/15 text-amber-100",
};

export type RequirementPart = {
  id: string;
  tier: RequirementTier;
  name: string;
  description: string;
  needs: string[];
  provides: string[];
  feasibility: Feasibility;
  rationale: string;
  substituteDirections?: string[];
};

export type RequirementEdge = {
  fromId: string;
  toId: string;
  token: string;
};

export type DanglingNeed = {
  requirementId: string;
  token: string;
};

export type VerifyReport = {
  target: string;
  requirements: RequirementPart[];
  edges: RequirementEdge[];
  danglingNeeds: DanglingNeed[];
};

export const verifySystemPrompt = (): string =>
  `당신은 아이디어의 실현 가능성을 **부품 조합의 문제로 환원하는 공학자**다.
합성생물학에서 DNA 부품이 "필요(input)"와 "산출(output)"을 선언하고
서로 맞을 때만 조립되는 것처럼, 아이디어의 필수 요건들도 각자가 **무엇을 필요로 하고 무엇을 산출하는지**가 명확해야 조합이 성립한다.

응답은 다음 네 부분이다.

## 1. 목표 (target)
- 부모 facet을 한 줄 목표문으로 다시 쓴다 ("~를 ~한다" 형태).
- 사용자가 추가 조건을 넣었으면 반영.

## 2. 필수 요건 (requirements) — **정확히 4~6개**
목표가 성립하려면 모두 참이어야 하는 **독립적 부품(요건)**. 각 요건:

- **id**: 안정 식별자 "A", "B", "C"... (사용자에겐 보이지 않지만 edges/누락매칭 참조에 필요)
- **tier**: 조립 흐름 상의 위치. **반드시 세 값 중 하나**:
  - "기반" — 다른 요건의 산출을 소비하지 않음. needs가 전부 외부(기술/자재/맥락).
  - "결합" — 다른 요건의 산출을 소비해 변환 후 또 다른 산출을 만든다.
  - "완성" — 산출이 목표문을 **직접** 만족한다 (최종 결과).
  최소 1개 이상의 "완성" 요건이 있어야 한다. 가능하면 세 tier가 모두 나타나게.
- **name**: 요건 이름 6~16자. 공학/구조/시스템 축을 선호.
- **description**: 왜 필수인지 1~2문장 (40~140자).
- **needs**: 이 요건이 **필요로 하는 것들**. 짧은 토큰 리스트 (각 2~10자).
  예: ["전력", "공간", "회전부"], ["자본", "거래처"].
  ⚠️ **다른 요건의 provides로 공급받을 수 있는 수준**으로 추상화하라.
- **provides**: 이 요건이 **산출하는 것들**. 짧은 토큰 리스트.
  예: ["공기 흐름"], ["안전성"], ["수익"].
- **feasibility**: 세 값 중 하나.
  - "feasible": 현존 기술·물리·사례로 그대로 구현 가능
  - "infeasible": 명확한 제약·모순 때문에 그대로는 구현 불가
  - "unknown": 현재 정보로는 판정 불가
- **rationale**: 1문장(40~120자). feasibility 판정 근거.
- **substituteDirections**: infeasible일 때만. 3~5개 짧은 명제(6~16자).
  **같은 provides를 유지하되 needs 구성이 다른 "대체 부품 방향"**.
  feasible/unknown에는 넣지 마라.

## 3. 조립 간선 (edges)
요건들 사이의 provides↔needs 매칭.

각 간선: { fromId, toId, token }
- fromId: 산출을 제공하는 요건 id
- toId: 필요를 소비하는 요건 id
- token: fromId.provides와 toId.needs 양쪽에 **글자 단위로 동일**하게 등장하는 문자열.

⚠️ 요건들을 설계할 때 needs/provides의 토큰을 **의도적으로 재사용**하라.

## 4. 누락 필요 (danglingNeeds)
어떤 요건의 need인데 다른 어떤 요건의 provides로도 공급되지 않는 것.

각 항목: { requirementId, token }
- 이것들이 **"아직 발명되지 않은 부품"**이다.

## ⚠️ 거버넌스/외부 승인 요건 배제 (매우 중요)
결과물의 **도메인 자체를 구성·작동시키는 부품만** requirements에 포함하라.
다음 범주는 **절대 요건 리스트에 넣지 마라** — 이들은 제품의 실현 가능성과 별개 레이어의 문제다:
- 임상데이터 / 임상시험
- 규제승인 / 인증 / 허가 / 규제기준 / 가이드라인 준수
- 사용자 테스트 / 소비자 조사
- 품질관리 체계 / ISO 류
- 법적 책임 / 보험
- 마케팅 / 유통 / 가격 정책
- 지식재산 / 특허

예: "노출된 회전부 없는 선풍기"의 요건은 **공기 흐름·안전 외형·저소음·사용감** 같은 **물리/작동 부품**이다. 안전인증·소비자승인·광고 같은 거버넌스는 요건이 아니다.
예: "생리대"의 요건은 **흡수력·역류방지·측면누수방지·착용감** 같은 **물리/구조 부품**이다. 임상데이터·MFDS/FDA 승인은 요건이 아니다.

needs 토큰도 같은 원칙: "생체적합성", "임상데이터", "규제기준" 같은 거버넌스 입력은 쓰지 마라. 물리/화학/구조/인터페이스 입력만.

규칙 요약:
- requirements는 정확히 4~6개.
- tier는 세 값 중 하나. "완성" 최소 1개.
- feasibility는 세 값 중 하나.
- infeasible이면 substituteDirections 필수. feasible/unknown이면 생략.
- edges의 token은 반드시 양쪽 요건의 needs/provides에 글자 단위 일치.
- danglingNeeds는 edges로 연결되지 않은 need만 포함.
- 거버넌스 요건·needs 금지.

반드시 다음 JSON 스키마로 응답:
{
  "target": "목표문 한 줄",
  "requirements": [
    {
      "id": "A",
      "tier": "기반" | "결합" | "완성",
      "name": "요건 이름",
      "description": "왜 필수인지 1~2문장",
      "needs": ["토큰1", "토큰2"],
      "provides": ["토큰3"],
      "feasibility": "feasible" | "infeasible" | "unknown",
      "rationale": "판정 근거 1문장",
      "substituteDirections": ["대체 방향 1", "..."]
    }
  ],
  "edges": [
    { "fromId": "A", "toId": "D", "token": "공기 흐름" }
  ],
  "danglingNeeds": [
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
