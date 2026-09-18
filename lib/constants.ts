export type BigCategory =
  | "제품"
  | "서비스"
  | "콘텐츠"
  | "공간"
  | "마케팅"
  | "프로그램"
  | "정책"
  | "비즈니스"
  | "방법·프로세스"
  | "실험·프로토타입";

export const kBigCategories: BigCategory[] = [
  "제품",
  "서비스",
  "콘텐츠",
  "공간",
  "마케팅",
  "프로그램",
  "정책",
  "비즈니스",
  "방법·프로세스",
  "실험·프로토타입",
];

export type ChipKind = "industry" | "psychology" | "object";

export const kTopicAxes = [
  "기능 불편",
  "행동 마찰",
  "감정 고통",
  "환경 제약",
  "사회적 장벽",
] as const;

export const kTopicAxesContent = [
  "공감 포인트",
  "갈등·긴장",
  "감정 동선",
  "상황 아이러니",
  "시청자 욕망",
] as const;

export const kIndustryAxes = [
  "핵심 작동 메커니즘",
  "반복 구조",
  "시간·공간 설계",
  "역할 분배",
  "보상·대가 구조",
] as const;

export const kPsychologyAxes = [
  "트리거 조건",
  "신체 반응",
  "강화 루프",
  "사회적 표출",
  "회피·대응",
] as const;

export const kObjectAxes = [
  "감각",
  "물성",
  "관용 행동",
  "정서적 연상",
] as const;

export const kIndustryPool = [
  "놀이공원", "카지노", "아이돌 팬덤", "중고거래", "공포게임",
  "소개팅앱", "군대", "택배", "스포츠", "오디션 프로그램",
  "RPG", "라이브 스트리밍", "종교", "주식", "동물원",
  "학원", "경매", "비밀결사", "편의점", "병원",
];

export const kPsychologyPool = [
  "인정욕구", "수집욕", "죄책감", "긴장감", "경쟁심",
  "관찰당하는 느낌", "소속감", "승부욕", "랜덤보상",
  "상실 회피", "몰입", "비교심리", "비밀공유", "의식(ritual)", "돌봄욕구",
];

export const kObjectPool = [
  "레몬", "거울", "자석", "모래시계", "유리잔",
  "바늘", "거품", "얼음", "향수", "풍선",
  "가시", "안개", "톱니바퀴", "돋보기", "비누",
  "실타래", "북극성", "점토", "낡은 책", "폴라로이드",
];

export const chipKindLabel: Record<ChipKind, string> = {
  industry: "산업/문화",
  psychology: "인간 심리",
  object: "사물·물성",
};

export const axesFor = (kind: ChipKind): readonly string[] => {
  switch (kind) {
    case "industry":
      return kIndustryAxes;
    case "psychology":
      return kPsychologyAxes;
    case "object":
      return kObjectAxes;
  }
};

export const poolFor = (kind: ChipKind): string[] => {
  switch (kind) {
    case "industry":
      return kIndustryPool;
    case "psychology":
      return kPsychologyPool;
    case "object":
      return kObjectPool;
  }
};

export const topicAxesFor = (cat?: BigCategory): readonly string[] =>
  cat === "콘텐츠" ? kTopicAxesContent : kTopicAxes;

export const OPENAI_MODEL_DEFAULT = "gpt-4o"; // legacy, unused

// Bump when prompts or axes change — invalidates all persisted/in-memory caches.
export const PROMPT_VERSION = "v8-2026-09-15";

export const MODEL_BY_PROVIDER = {
  gemini: {
    lite: "gemini-3.6-flash",
    flash: "gemini-3.6-flash",
    pro: "gemini-3.6-flash",
  },
  anthropic: {
    lite: "claude-haiku-4-5-20251001",
    flash: "claude-haiku-4-5-20251001",
    pro: "claude-sonnet-4-6",
  },
} as const;

export type ModelTier = "lite" | "flash" | "pro";

export const modelFor = (
  provider: "gemini" | "anthropic",
  tier: ModelTier,
): string => MODEL_BY_PROVIDER[provider][tier];

export const kSimilarCategories = [
  "자연",
  "생물",
  "물리·화학",
  "역사·문명",
  "예술·문화",
  "스포츠·게임",
  "기술·공학",
  "수학·이론",
] as const;

export type SimilarCategory = (typeof kSimilarCategories)[number];
