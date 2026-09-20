export type ThinkingPurposeId =
  | "problem"
  | "perspective"
  | "insight"
  | "method"
  | "marketing";

export type ThinkingPurpose = {
  id: string;
  label: string;
  isCustom?: boolean;
};

export const kBuiltinPurposes: ThinkingPurpose[] = [
  { id: "problem", label: "문제분해" },
  { id: "structure", label: "구조분해" },
];

export const DEFAULT_PURPOSE_ID = "structure";

export const purposeLabel = (id: string, custom: ThinkingPurpose[]): string => {
  const b = kBuiltinPurposes.find((p) => p.id === id);
  if (b) return b.label;
  const c = custom.find((p) => p.id === id);
  return c?.label ?? id;
};

export const purposePromptFragment = (
  id: string,
  customLabel?: string,
): string => {
  switch (id) {
    case "problem":
      return `사고 목적: **문제 해결 → 변수축 분해**
- 이 facet을 문제 상황에서 실제로 **조작·변화시킬 수 있는 변수·조건** 3~5개로 분해하라.
- 각 sub-facet은 값을 바꾸면 결과가 달라지는 변수여야 한다.
- 감정 표현·현상 서술 금지. 조작 가능한 축만.`;
    case "perspective":
      return `사고 목적: **새로운 관점 → 관찰축 분해**
- 이 facet(현상)을 볼 수 있는 서로 다른 **관찰 앵글·시선·프레임** 3~5개로 분해하라.
- 각 sub-facet은 이 현상을 다른 층위에서 재해석하는 관점이어야 한다.
- 해결책·개선 방향 금지. 관찰의 종류만.`;
    case "insight":
      return `사고 목적: **통찰 → 핵심 개념 추출**
- 이 facet(경험·철학)에서 파생되는 **근본 개념** 3~5개로 분해하라.
- 각 sub-facet은 다른 경험·현상과 연결될 수 있는 추상 단위(개념명 + 짧은 정의)여야 한다.
- 구체 사례 나열 금지. 이식 가능한 개념만.`;
    case "method":
      return `사고 목적: **새로운 방법 → 작동 원리 분해**
- 이 facet(도메인)이 실제로 작동하는 **핵심 메커니즘·원리** 3~5개로 분해하라.
- 각 sub-facet은 다른 도메인에 이식할 수 있는 형태의 작동 원리여야 한다.
- 표층적 관행·용어 나열 금지. 왜 작동하는지의 원리만.`;
    case "marketing":
      return `사고 목적: **마케팅 → 전달 요소 분해**
- 이 facet(목표/제품)이 사용자에게 도달하기 위한 서로 다른 **전달 요소** 3~5개로 분해하라.
- 각 sub-facet은 채널·메시지·감각·행동 유인 등 전달 구성 요소여야 한다.
- 제품 기능 자체 서술 금지. 전달·도달 방식만.`;
    default:
      return `사고 목적: **${customLabel ?? id} 관점**
- 이 facet을 위 목적의 관점에서 3~5개의 하위 요소로 분해하라.
- 각 sub-facet은 그 목적을 달성하는 데 필요한 서로 다른 단면이어야 한다.`;
  }
};
