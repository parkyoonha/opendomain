export type ThinkingDirection = {
  id: string;
  label: string;
  isCustom?: boolean;
};

export const kBuiltinDirections: ThinkingDirection[] = [
  { id: "none", label: "없음" },
  { id: "perspective", label: "관점" },
  { id: "insight", label: "통찰" },
  { id: "understanding", label: "이해" },
  { id: "question", label: "질문" },
  { id: "hypothesis", label: "가설" },
  { id: "interpretation", label: "해석" },
  { id: "philosophy", label: "철학/생각" },
];

export const DEFAULT_DIRECTION_ID = "none";

export const directionLabel = (
  id: string,
  custom: ThinkingDirection[],
): string => {
  const b = kBuiltinDirections.find((d) => d.id === id);
  if (b) return b.label;
  const c = custom.find((d) => d.id === id);
  return c?.label ?? id;
};

export const directionPromptFragment = (
  id: string,
  customLabel?: string,
): string => {
  switch (id) {
    case "none":
      return "";
    case "perspective":
      return `사고 방향: **관점 — 다르게 바라보기**
- 이 facet을 볼 수 있는 서로 다른 관찰 앵글 3~5개로 분해하라.
- 각 sub-facet은 이 대상을 낯설게 만드는 새로운 시선이어야 한다.
- 해결책 지향 금지. 관찰의 종류만.
- 축 이름은 접근 가능한 개념어 사용 ("인식론적 문제", "시간성의 격차", "윤리적 비대칭" 등). 낯선 조어("현현", "외부화") 회피.`;
    case "insight":
      return `사고 방향: **통찰 — 새로운 관계/의미 발견**
- 이 facet에서 새로운 관계·의미가 드러나는 지점 3~5개로 분해하라.
- 각 sub-facet은 A와 B의 뜻밖의 연결·유사·전이 관계여야 한다.
- 개별 사실 나열 금지. 관계·의미 구조만.`;
    case "understanding":
      return `사고 방향: **이해 — 복잡한 것을 이해하기**
- 이 facet을 이해하기 위한 서로 다른 설명 층위 3~5개로 분해하라.
- 각 sub-facet은 복잡성을 낮추는 다른 각도의 모델·비유·구조여야 한다.
- 표층 기술 금지. 이해를 돕는 축소·재구성만.`;
    case "question":
      return `사고 방향: **질문 — 새로운 질문 발견**
- 이 facet에서 아직 던져지지 않은 질문 3~5개를 뽑아라.
- 각 sub-facet은 완결된 답이 아닌 열린 질문 형태여야 한다.
- 뻔한 FAQ 금지. 이 대상을 새로 파고들게 하는 질문.`;
    case "hypothesis":
      return `사고 방향: **가설 — 아직 검증되지 않은 새로운 생각**
- 이 facet에 대한 미검증 가설 3~5개를 제안하라.
- 각 sub-facet은 "~일 수 있다 / ~이라면 어떻게 되는가" 형태.
- 이미 검증된 사실 재진술 금지. 반증 가능한 추측만.`;
    case "interpretation":
      return `사고 방향: **해석 — 현상에 대한 새로운 해석**
- 이 facet(현상)에 대한 서로 다른 해석 3~5개를 제시하라.
- 각 sub-facet은 같은 사실을 다르게 읽어내는 해석 프레임이어야 한다.
- 통설 반복 금지. 새로운 해석 각도만.`;
    case "philosophy":
      return `사고 방향: **철학/생각 — 삶이나 인간에 대한 새로운 생각**
- 이 facet에서 삶·인간·존재에 대해 파생되는 사유 3~5개로 분해하라.
- 각 sub-facet은 이 대상을 통해 확장되는 사유 명제여야 한다.
- 자기계발 슬로건 금지. 진지한 사유의 결.`;
    default:
      return `사고 방향: **${customLabel ?? id}**
- 이 facet을 위 방향에서 3~5개의 하위 요소로 분해하라.
- 각 sub-facet은 그 방향을 구현하는 서로 다른 단면이어야 한다.`;
  }
};
