// Verification-mode data models. Parallel to lib/directions.ts, but for
// the controller's "증명" tab: user picks a verification method + an
// evaluation stance, then LLM produces sub-facets that reality-check the
// parent principle from that angle.

export type VerifyMethod = {
  id: string;
  label: string;
};

export const kVerifyMethods: VerifyMethod[] = [
  { id: "physics", label: "물리 성립성" },
  { id: "analog", label: "유사 존재" },
  { id: "materials", label: "재료·부품" },
  { id: "cost", label: "비용 자릿수" },
  { id: "regulation", label: "규제·안전" },
  { id: "falsification", label: "반증 조건" },
];

export const DEFAULT_VERIFY_METHOD_ID = "physics";

export type VerifyEvaluation = {
  id: string;
  label: string;
};

export const kVerifyEvaluations: VerifyEvaluation[] = [
  { id: "qualitative", label: "정성적" },
  { id: "quantitative", label: "정량적" },
  { id: "experimental", label: "실험 가능" },
];

export const DEFAULT_VERIFY_EVAL_ID = "qualitative";

export const verifyMethodLabel = (id: string): string =>
  kVerifyMethods.find((m) => m.id === id)?.label ?? id;

export const verifyEvalLabel = (id: string): string =>
  kVerifyEvaluations.find((e) => e.id === id)?.label ?? id;

// Direction-style prompt fragment describing what the LLM should produce
// for a given (method, evaluation) pair. Kept in a single function so the
// verify API route stays skinny.
export const verifyMethodPromptFragment = (methodId: string): string => {
  switch (methodId) {
    case "physics":
      return `증명 방식: **물리 성립성 검토**

부모 facet의 원리가 실제 물리 법칙(역학·열역학·유체·전자기·화학평형 등)에 위배되지 않는지 검토하라.

각 항목:
- **name**: 검토된 물리 조건·원리·한계 (짧게).
  좋음: "표면장력이 흡수 속도를 제한", "밀도 차로 인한 자연 대류 성립", "필요 압력이 재료 강도 초과"
  나쁨: "물리적으로 가능함" (평가어), "잘 될 것 같다" (막연한 낙관)
- **principle**: 관련 법칙·수식·조건과 부모 원리가 어떻게 맞물리는지 1~2문장. 성립·불성립을 명확히.
  성립 시: 어떤 조건에서 성립하는가
  불성립 시: 어떤 물리 한계에 걸리는가

규칙: 3~5개. 낙관/비관 아닌 **구체 물리 조건**만.`;

    case "analog":
      return `증명 방식: **유사 존재 사례 발굴**

부모 원리와 동일·유사한 메커니즘이 이미 자연·산업·역사에 존재하는지 찾아라. 존재하면 그 자체가 실현 가능성의 증거.

각 항목:
- **name**: 유사 사례의 이름 (짧게, 도메인 명시).
  좋음: "잎맥의 계층적 유수 분포", "SAP 폴리머(기저귀)", "고어텍스 다층 구조"
  나쁨: "비슷한 것 많음" (막연), "이미 있음" (구체 없음)
- **principle**: 그 사례가 어떤 원리를 어떻게 구현하고 있으며 부모 원리와 어느 지점에서 겹치는지 1~2문장.

규칙: 3~5개. 자연·산업·역사에서 서로 다른 도메인. 구체 이름만.`;

    case "materials":
      return `증명 방식: **재료·부품 가용성 검토**

부모 원리를 구현하는 데 필요한 재료·부품이 상용화되어 있는지, 어느 수준(연구실/파일럿/양산)에 있는지 검토하라.

각 항목:
- **name**: 필요한 재료·부품의 이름과 가용 상태 (짧게).
  좋음: "폴리아크릴산 나트륨 (양산)", "MEMS 유량 센서 (파일럿)", "그래핀 코팅 (연구실)"
  나쁨: "필요한 재료 많음" (막연)
- **principle**: 왜 이 재료가 필요하고, 현재 어떤 성능·가격·공급 상태에 있는지 1~2문장.

규칙: 3~5개. 상용 수준을 반드시 명시.`;

    case "cost":
      return `증명 방식: **비용 자릿수 추정**

부모 원리를 실제 제품·서비스로 구현할 때 비용 자릿수를 추정하라. 정확한 숫자보다 자릿수(order of magnitude)가 목적.

각 항목:
- **name**: 비용 항목과 자릿수 (짧게).
  좋음: "핵심 재료 원가 ~₩100/unit", "초기 R&D ~₩10억", "인증 비용 ~₩3천만"
  나쁨: "비쌈" / "저렴함" (자릿수 없음)
- **principle**: 어떻게 이 자릿수가 나오는지 근거 1~2문장. 비교 기준(유사 제품/공정) 언급.

규칙: 3~5개. 재료·개발·인증·제조·유통 등 다른 항목별.`;

    case "regulation":
      return `증명 방식: **규제·안전 기준 검토**

부모 원리를 실제로 제공할 때 걸리는 법적·안전·인증 요건을 짚어라.

각 항목:
- **name**: 걸리는 규제·기준의 이름 (짧게).
  좋음: "의료기기 2등급 인증 필요", "KC 인증 대상 아님", "화장품법 화학첨가물 제한"
  나쁨: "규제 있음" (막연), "복잡함" (평가어)
- **principle**: 왜 이 규제가 적용되며 통과하려면 어떤 조건이 필요한지 1~2문장.

규칙: 3~5개. 국내 기준 우선, 필요 시 해외 병기.`;

    case "falsification":
      return `증명 방식: **반증 조건 설계**

부모 원리가 틀렸다고 판단할 조건을 명시하라. "어떤 결과가 나오면 이 아이디어를 폐기하는가?"

각 항목:
- **name**: 반증 기준 (짧게, 수치 포함).
  좋음: "5초 내 15ml 흡수 실패 시 폐기", "표면 압력 >2kPa 시 불가", "생산단가 >₩5,000/unit이면 시장성 없음"
  나쁨: "안 될 수도 있음" (막연), "테스트 필요" (기준 없음)
- **principle**: 왜 이 기준이 결정적인지, 어떻게 측정하는지 1~2문장.

규칙: 3~5개. 각 기준은 실험/데이터로 검증 가능해야 함.`;

    default:
      return `증명 방식: **${methodId}**
- 부모 원리를 위 방식으로 검증 가능한 3~5개 조건·근거로 분해.`;
  }
};

export const verifyEvalPromptFragment = (evalId: string): string => {
  switch (evalId) {
    case "qualitative":
      return `평가 축: **정성적** — 방향성·논리·존재 여부 중심. 정확한 수치보다 개념적 성립·불성립을 명확히.`;
    case "quantitative":
      return `평가 축: **정량적** — 반드시 수치·단위·자릿수를 포함하라. 계산 과정이 드러날 것.`;
    case "experimental":
      return `평가 축: **실험 가능** — 프로토타입·측정·검증 가능한 형태로 서술. "이렇게 실험하면 확인된다" 형식.`;
    default:
      return `평가 축: **${evalId}**`;
  }
};

export const verifyPrompt = (
  parentAxis: string,
  parentPrinciple: string,
  methodId: string,
  evalId: string,
  rootTopic?: string,
): string => {
  const rootLine = rootTopic
    ? `\n**핵심 주제 (anchor): ${rootTopic}** — 검증은 이 주제 맥락 안에서.`
    : "";
  return `${verifyMethodPromptFragment(methodId)}

${verifyEvalPromptFragment(evalId)}

부모 축: ${parentAxis}
부모 원리: ${parentPrinciple}${rootLine}

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "짧은 이름", "principle": "1~2문장 근거·조건"}
  ]
}
axes 배열에 3~5개 원소.`;
};
