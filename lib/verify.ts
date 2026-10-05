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
  // When feasibility === "infeasible", the LLM identifies which of the
  // needs is actually the blocker (so the resolve button can seed the
  // matrix with that as excludeNeed). Empty/absent → no specific exclude.
  conflictingNeed?: string;
  // When feasibility === "infeasible", a one-line restated goal that
  // treats "this conflict is solved" as a new product goal. Shown
  // prominently in the 충돌·실패 block so the user reads the blocker
  // as a sub-goal (e.g. "회전 날개 없이 바람을 만드는 선풍기").
  resolvedGoal?: string;
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
  // Intermediate product-analysis step (shown between target and
  // requirements). Grounds the user in the current product category and
  // its structural limitation, so the critical infeasible requirement
  // naturally reads as "the thing that must be broken to achieve the
  // goal." Optional — older reports and underspecified goals may omit.
  baselineProduct?: string;
  baselineLimitation?: string;
  requirements: RequirementPart[];
  edges: RequirementEdge[];
  danglingNeeds: DanglingNeed[];
};

// Focus-matrix: when the user clicks a need pill in a verify report, the
// chip panel evaluates candidate chips against ALL requirements and
// renders a 후보 × 요건 matching table. This is the "automated 매칭 검사"
// step so the user sees which candidate satisfies which requirements at
// a glance rather than guessing from a flat list.

export type FocusMatchVerdict = "pass" | "partial" | "fail";

export const focusMatchIcon: Record<FocusMatchVerdict, string> = {
  pass: "○",
  partial: "△",
  fail: "✗",
};

export const focusMatchColor: Record<FocusMatchVerdict, string> = {
  pass: "text-emerald-200",
  partial: "text-amber-200",
  fail: "text-rose-200",
};

export type FocusMatchCell = {
  requirementId: string;
  verdict: FocusMatchVerdict;
  note: string;
};

export type FocusChipCandidate = {
  chipText: string;
  category: string;
  reason: string;
  matches: FocusMatchCell[];
};

export const verifySystemPrompt = (): string =>
  `당신은 아이디어의 **숨겨진 모순을 집요하게 찾는 공학자**다.

## 핵심 임무: 제품 카테고리의 구조적 한계를 깬다
사용자가 던진 아이디어는 보통 **현재 시장의 전형 제품으로는 완벽히 달성 못 하는 목표**다. 그 "달성 못 함"의 이유를 짚어내서, 사용자가 어떤 **구조적 가정을 깨야 하는지** 알려주는 것이 당신의 가장 중요한 역할이다.

증명은 **순차적 분석**이다. 순서를 지켜라:

### STEP 1 — 제품 분석 (baselineProduct + baselineLimitation)
사용자 목표에 가장 가까운 **현재 시장의 전형 제품 카테고리**를 명시하라.
- baselineProduct (최대 20자): 그 전형 제품의 이름. 예: "회전 날개 선풍기", "외부 흡수 패드", "손목 보호대".
- baselineLimitation (최대 40자): 그 제품이 **이 목표를 왜 완벽히 달성 못 하는지** 한 줄. 예: "날개 노출로 손가락 접근 가능", "몸을 타고 흐르는 혈을 못 잡음".

⚠️ 이 단계가 전체 분석의 **기준점**이다. baselineLimitation이 뚫려야 할 벽이고, 뒤의 infeasible 요건이 바로 그 벽을 가리킨다.

### STEP 2 — 모순 발견 절차
baselineLimitation을 깨려면 **어떤 요건이 추가**되어야 하는가? 그 요건의 **상식적 구현**이 다른 요건의 명시적 제약과 충돌하는가?

예:
- 선풍기 (baselineLimitation="날개 노출") → "바람 생성" 요건이 상식적으로 "회전 날개"를 쓰는데, "안전 외형" 요건의 "회전부 노출 없음" 제약과 충돌 → "바람 생성" infeasible
- 생리대 (baselineLimitation="몸을 타고 흐르는 혈 못 잡음") → "포집" 요건이 상식적으로 "외부 패드 흡수"를 쓰는데, "누운 자세에서 흐르는 혈 포집" 제약과 충돌 → "포집" infeasible

그 요건에:
- conflictingNeed = 상식 수단 토큰 (예: "회전 날개", "외부 패드")
- resolvedGoal = 전체 아이디어를 그 수단 없이 재진술 (예: "회전 날개 없이 바람을 만드는 선풍기", "몸을 타고 흐르기 전에 혈을 포집하는 생리 제품")

### STEP 3 — 하나의 집중 모순
- **requirements 중 정확히 1개 (최대 2개)만 infeasible**로 설정하라. 전부 feasible이거나 전부 infeasible 금지.
- 그 infeasible 요건이 **baselineLimitation을 뚫는 지점**이어야 한다. 사이드 이슈(역류 방지, 저소음 같은 세부 조건)를 infeasible로 삼지 마라.
- resolvedGoal이 **baselineProduct 카테고리 자체를 재정의**하는 수준이어야 한다 — "같은 제품을 조금 개선"이 아니라 **"다른 메커니즘으로 전환"**.

응답은 다음 네 부분이다.

## 1. 목표 + 제품 분석
- **target**: 부모 facet을 한 줄 목표문으로 다시 쓴다 ("~를 ~한다" 형태). 사용자 추가 조건 반영.
- **baselineProduct**: STEP 1에서 정한 전형 제품 카테고리 (최대 20자).
- **baselineLimitation**: STEP 1에서 정한 그 제품의 한계 (최대 40자).

## 2. 필수 요건 (requirements) — **정확히 3~4개**
목표가 성립하려면 모두 참이어야 하는 **독립적 부품(요건)**. **반드시 3~4개로 압축**하라 — 5개 이상 금지. 사용자는 적은 수의 요건을 집중해서 보는 것을 선호한다.

각 요건:

- **id**: 안정 식별자 "A", "B", "C"... (사용자에겐 보이지 않지만 edges/누락매칭 참조에 필요)
- **tier**: 조립 흐름 상의 위치. **반드시 세 값 중 하나**:
  - "기반" — 다른 요건의 산출을 소비하지 않음. needs가 전부 외부(기술/자재/맥락).
  - "결합" — 다른 요건의 산출을 소비해 변환 후 또 다른 산출을 만든다.
  - "완성" — 산출이 목표문을 **직접** 만족한다 (최종 결과).
  최소 1개 이상의 "완성" 요건이 있어야 한다.
- **name**: 요건 이름 **6~12자**. 명사형, 기능 축. **쉬운 말**로. 예: "바람 생성", "안전 외형", "힘 저장", "소음 억제", "크기".
- **description**: **최대 24자의 한 줄 서술**. "~한다" 또는 "~이 필요" 식의 짧은 동사구. 예: "바람을 만든다", "노출된 회전부가 없다", "일반 가정에서 쓸 수 있다".

⚠️ **전문용어 금지 (매우 중요)**
- 사용자 입력 아이디어에 전문용어가 섞여 있어도 **요건의 name/description은 일반인이 그대로 이해할 수 있는 쉬운 말**로 번역하라.
- ❌ 금지: "래칫 게이팅", "임피던스 매칭", "비선형 반응", "압전 변환", "탄성 모듈러스", "히스테리시스" 같은 공학/학술 조어
- ✅ 허용: "힘을 모아 뒀다가 터뜨린다", "소음이 작다", "손목에 작게 찬다", "충격이 공격자에게 전달된다"
- 전문 부품명·기술명은 **needs/provides 토큰에만** 사용 (사용자 UI엔 안 보임, LLM 매칭용).
- 핵심: 두 번째 캡처본 수준의 쉬움 — "A: 바람을 만든다", "B: 노출된 회전부가 없다 (안전성)", "C: 조용하다", "D: 일반 가정에서 쓸 수 있다".
- **needs**: 이 요건이 **필요로 하는 것들**. 짧은 토큰 리스트 (각 2~10자).
  ⚠️ **다른 요건의 provides로 공급받을 수 있는 수준**으로 추상화하라.
- **provides**: 이 요건이 **산출하는 것들**. 짧은 토큰 리스트.
- **feasibility**: 세 값 중 하나.
  - "feasible": 현존 기술·물리·사례로 그대로 구현 가능
  - "infeasible": 명확한 제약·모순 때문에 그대로는 구현 불가 (**다른 요건의 needs와 충돌**하거나, 물리/시장 한계)
  - "unknown": 현재 정보로는 판정 불가
- **rationale**: **최대 40자 한 줄**. 왜 그 feasibility인지. infeasible이면 **어느 요건·토큰과 충돌하는지** 반드시 명시.
- **substituteDirections**: infeasible일 때만. 3~5개 짧은 명제(6~16자). 같은 provides를 유지하되 needs 구성이 다른 대체 부품 방향.
- **conflictingNeed**: **infeasible일 때만**. 이 요건의 needs 중 **다른 요건과 모순을 일으키는 토큰** 하나를 그대로 적는다. 예: 이 요건이 "회전 날개"를 needs로 가지는데 다른 요건이 "회전부 노출 없음"을 needs로 요구하면 conflictingNeed 값은 "회전 날개". 사용자가 "해결" 버튼을 눌렀을 때 매칭 매트릭스에서 이 토큰을 제외하기 위함. feasible/unknown에는 넣지 마라.
- **resolvedGoal**: **infeasible일 때만**. 그 충돌이 해결된 상태의 **아이디어 전체를 한 줄 목표문으로 재진술** (최대 40자). "~없이 ~한다", "~로 ~을 만든다" 식의 **쉬운 말 목표문**. 예:
  - 원 아이디어: "아이가 손가락 넣어도 안전한 선풍기", 충돌: A가 회전 날개를 요구함 → resolvedGoal: "회전 날개 없이 바람을 만드는 선풍기"
  - 원 아이디어: "손목 스프링-래칫 방어구", 충돌: 반발력이 공격자에 안 닿음 → resolvedGoal: "충격이 공격자에게 제대로 전달되는 손목 방어구"
  이 문장은 사용자가 "해결" 버튼으로 매칭 매트릭스를 열기 전에 **새로운 목표로서** 읽는다. 전문용어 금지, 반드시 쉬운 말로.

## 3. 조립 간선 (edges)
요건들 사이의 provides↔needs 매칭.

각 간선: { fromId, toId, token }
- fromId: 산출을 제공하는 요건 id
- toId: 필요를 소비하는 요건 id
- token: fromId.provides와 toId.needs 양쪽에 **글자 단위로 동일**하게 등장하는 문자열.

⚠️ 요건들을 설계할 때 needs/provides의 토큰을 **의도적으로 재사용**하라.

## 4. 누락 필요 (danglingNeeds)
어떤 요건의 need인데 **다른 요건의 provides로도 공급되지 않는** 토큰.

각 항목: { requirementId, token }
- 이것들이 **"아직 발명되지 않은 부품"**이다 — 사용자가 유사칩으로 공급원을 찾아야 할 지점.

### ⚠️ 매우 중요: dangling에 넣지 말 것
- **외부에서 당연히 공급받는 입력은 dangling에 넣지 마라.**
  예: "전기", "전력", "물", "공기", "자본", "공간", "에너지원", "원재료", "사용자", "시간"
  이들은 어차피 외부에서 공급받는 전제이므로 "공급원 탐색" 대상이 아니다.
- dangling은 보통 **0~1개**가 적절. 많이 만들지 마라.
- 모순은 **conflictingNeed + infeasible**로 표현하고, dangling은 **진짜 "아직 없는 부품"**일 때만 쓰라.
- 모순이 있는 경우 dangling은 **빈 배열이어도 좋다** — 진짜 발명 포인트는 resolvedGoal이지 dangling이 아니다.

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

## 예시 (반드시 따라야 할 응답 패턴)

### 예시 1: "아이가 손가락 넣어도 안전한 선풍기"
- target: "아이가 손가락 넣어도 안전한 선풍기"
- **baselineProduct**: "회전 날개 선풍기"
- **baselineLimitation**: "날개 노출로 손가락 접근 가능"
- requirements (4개):
  - A (기반, name="바람 생성", description="바람을 만든다", needs=["전력", "회전 날개"], provides=["공기 흐름"], **feasibility="infeasible"** — 회전 날개가 B의 "회전부 노출 없음"과 모순, conflictingNeed="회전 날개", resolvedGoal="회전 날개 없이 바람을 만드는 선풍기")
  - B (결합, name="안전성", description="노출된 회전부가 없다", needs=["회전부 노출 없음", "공기 흐름"], provides=["안전성"], feasible)
  - C (결합, name="저소음", description="조용하다", needs=["저속 작동"], provides=["저소음"], feasible)
  - D (완성, name="가정용", description="일반 가정에서 쓸 수 있다", needs=["공기 흐름", "안전성", "저소음", "적정 크기"], provides=["완제품"], feasible)
- danglingNeeds: []

### 예시 2: "누워도 새지 않는 생리대"
- target: "누워도 새지 않는 생리대"
- **baselineProduct**: "외부 흡수 패드"
- **baselineLimitation**: "몸을 타고 흐르는 혈을 패드가 못 잡음"
- requirements (4개):
  - A (기반, name="혈 포집", description="흐르기 전에 혈을 잡는다", needs=["외부 패드 흡수"], provides=["포집"], **feasibility="infeasible"** — 외부 패드로는 측와위 유동 혈을 못 잡음, conflictingNeed="외부 패드 흡수", resolvedGoal="몸을 타고 흐르기 전에 혈을 포집하는 생리 제품")
  - B (결합, name="측면 밀봉", description="옆으로 새지 않는다", needs=["측면 접촉"], provides=["측면 밀봉"], feasible)
  - C (결합, name="자세 적응", description="누운 자세에서도 작동한다", needs=["포집", "측면 밀봉"], provides=["자세 적응"], feasible)
  - D (완성, name="착용감", description="오래 착용해도 불편하지 않다", needs=["포집", "측면 밀봉", "자세 적응"], provides=["완제품"], feasible)
- danglingNeeds: []

**핵심 패턴**: baselineLimitation이 "뚫어야 할 벽"을 정의하고, infeasible 요건이 바로 그 벽을 가리키고, resolvedGoal이 **제품 카테고리를 재정의**한다 ("회전 날개 선풍기" → 날개 없는 바람 생성 / "외부 흡수 패드" → 흐름 전 포집 구조). "역류 방지"처럼 사이드 디테일을 infeasible로 삼으면 안 된다.

규칙 요약:
- **baselineProduct + baselineLimitation 필수** — 전체 분석의 기준점.
- requirements는 **정확히 3~4개**.
- **1개(최대 2개) 요건이 infeasible** — baselineLimitation을 뚫는 지점. 사이드 디테일 금지.
- resolvedGoal이 baselineProduct 카테고리 자체를 재정의해야 함.
- danglingNeeds는 **0~1개가 보통**. 외부 공급 전제 토큰(전기/공기/자본 등) 절대 포함 금지.
- tier는 세 값 중 하나. "완성" 최소 1개.
- feasibility는 세 값 중 하나.
- infeasible이면 substituteDirections 필수. feasible/unknown이면 생략.
- edges의 token은 반드시 양쪽 요건의 needs/provides에 글자 단위 일치.
- danglingNeeds는 edges로 연결되지 않은 need만 포함.
- 거버넌스 요건·needs 금지.

반드시 다음 JSON 스키마로 응답:
{
  "target": "목표문 한 줄",
  "baselineProduct": "전형 제품 카테고리 (최대 20자)",
  "baselineLimitation": "그 제품의 한계 (최대 40자)",
  "requirements": [
    {
      "id": "A",
      "tier": "기반" | "결합" | "완성",
      "name": "요건 이름",
      "description": "최대 24자 한 줄 서술",
      "needs": ["토큰1", "토큰2"],
      "provides": ["토큰3"],
      "feasibility": "feasible" | "infeasible" | "unknown",
      "rationale": "최대 40자 한 줄 근거",
      "substituteDirections": ["대체 방향 1", "..."],
      "conflictingNeed": "충돌 토큰 (infeasible만)",
      "resolvedGoal": "충돌 해결된 상태의 재진술 목표문 (infeasible만)"
    }
  ],
  "edges": [
    { "fromId": "A", "toId": "D", "token": "공기 흐름" }
  ],
  "danglingNeeds": [
    { "requirementId": "D", "token": "고객" }
  ]
}
requirements는 정확히 3~4개.`;

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
