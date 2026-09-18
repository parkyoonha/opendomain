export type Lens = {
  discipline: string;
  scholars: string[];
};

export const kBuiltinLenses: Lens[] = [
  {
    discipline: "철학",
    scholars: ["칸트", "니체", "하이데거", "비트겐슈타인", "사르트르", "데리다"],
  },
  {
    discipline: "사회학",
    scholars: ["뒤르켐", "베버", "마르크스", "부르디외", "고프만", "하버마스"],
  },
  {
    discipline: "심리학",
    scholars: ["프로이트", "융", "스키너", "카너먼", "매슬로", "피아제"],
  },
  {
    discipline: "생물학",
    scholars: ["다윈", "도킨스", "굴드", "마투라나", "윌슨", "마굴리스"],
  },
  {
    discipline: "인류학",
    scholars: ["레비스트로스", "기어츠", "말리노프스키", "그레이버", "인골드"],
  },
  {
    discipline: "종교·신학",
    scholars: ["아우구스티누스", "토마스 아퀴나스", "루터", "붓다", "노자", "알가잘리"],
  },
  {
    discipline: "경제학",
    scholars: ["애덤 스미스", "케인즈", "하이에크", "마르크스", "세일러", "슘페터"],
  },
  {
    discipline: "정치학",
    scholars: ["홉스", "로크", "마키아벨리", "아렌트", "슈미트", "롤스"],
  },
  {
    discipline: "언어학",
    scholars: ["소쉬르", "촘스키", "야콥슨", "오스틴", "라캉"],
  },
  {
    discipline: "미디어학",
    scholars: ["맥루한", "보드리야르", "플루서", "마노비치", "키틀러"],
  },
  {
    discipline: "물리학",
    scholars: ["뉴턴", "아인슈타인", "보어", "파인만", "호킹"],
  },
  {
    discipline: "수학",
    scholars: ["유클리드", "가우스", "괴델", "튜링", "만델브로트"],
  },
  {
    discipline: "역사학",
    scholars: ["브로델", "카", "홉스봄", "푸코", "다이아몬드"],
  },
  {
    discipline: "예술·미학",
    scholars: ["벤야민", "랑시에르", "뒤샹", "워홀", "칸트(미학)"],
  },
  {
    discipline: "문학",
    scholars: ["셰익스피어", "도스토옙스키", "카프카", "보르헤스", "쿤데라"],
  },
];

export type SelectedLens = {
  discipline: string;
  scholar: string | null;
  isCustom?: boolean;
};

export const lensLabel = (lens: SelectedLens | null): string => {
  if (!lens) return "빈렌즈";
  if (lens.scholar) return `${lens.discipline} · ${lens.scholar}`;
  return `${lens.discipline}`;
};

export const lensKey = (lens: SelectedLens | null): string =>
  lens ? `${lens.discipline}::${lens.scholar ?? "*"}` : "none";

export const lensPromptFragment = (lens: SelectedLens | null): string => {
  if (!lens) return "";
  const perspective = lens.scholar
    ? `${lens.discipline}의 ${lens.scholar} 관점`
    : `${lens.discipline}의 학문적 관점`;
  return `**적용 렌즈: ${perspective}**
- 위 렌즈의 개념·방법론·핵심 통찰을 분해/조합의 시선으로 삼는다.
- 렌즈의 고유 어휘·프레임을 재료로 활용하되, 억지 인용·현학적 나열은 금지.
- 렌즈가 실제로 그 대상을 바라볼 때 드러내는 *구조·긴장·전제*를 결과에 반영하라.

**가독성 규칙 (매우 중요)**:
- 이름과 서술 모두 **잘 알려진 개념어** 우선 사용 (인식론적/존재론적/규범적/시간성/주체성/윤리적/이중성/비대칭성 등)
- 낯선 조어·의역·명사화 남발 금지: "현현", "외부화", "파편화", "타율적", "은폐", "정립", "탈-존" 같은 무거운 하이데거식 조어를 나열하지 말 것
- 축 이름만 봐도 본문 내용을 즉시 짐작 가능해야 한다
- 좋음: "시간의 비가시성 — 교체 필요 시간을 외부 시계로 측정할 수 없다"
- 나쁨: "타율적 시간의 일상 단절 — 정기적 시점이 몰입 중인 과업을 파편화한다" (이름이 이해에 방해)`;
};
