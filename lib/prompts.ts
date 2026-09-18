import type { BigCategory } from "./constants";
import { lensPromptFragment, type SelectedLens } from "./lenses";
import { directionPromptFragment } from "./directions";

const withLens = (base: string, lens?: SelectedLens | null): string => {
  const frag = lensPromptFragment(lens ?? null);
  return frag ? `${base}\n\n${frag}` : base;
};

const topicPurposeSpec = (
  purposeId: string,
): { directive: string } | null => {
  if (purposeId === "problem") {
    return {
      directive: `당신은 주제를 *사용자가 겪는 문제* 단위로 분해하는 분석가다.
축은 이 주제에서 실제로 존재하는 고통·불편·마찰·제약의 서로 다른 차원이다.

**축 생성 규칙 (매우 중요)**
- **정해진 축 이름 없음.** 주제에 맞춰 3~5개의 축을 자유롭게 뽑아라.
- **각 축 이름은 그 내용을 즉시 드러내는 짧은 명제** (6~14자). 이름만 봐도 무슨 문제인지 감이 와야.
- 축들은 서로 다른 차원(기능/행동/감정/환경/사회/제도/관계 등에서 이 주제에 맞는 것만)이어야 함. 내용·원인·주체가 겹치면 안 됨.

**필수 사전 단계 — 핵심 문제 추출**
사용자 입력이 [핵심 문제 + 해결 vehicle] 구조일 수 있다.
Vehicle 신호: "X 기반", "X 통한", "X로 해결", "X 활용".
→ Vehicle은 **무시**하고 근본 문제만 분해. 축 이름·서술에 vehicle 등장 금지.

**축 서술 규칙 (idea-engine 스타일)**
- 각 축마다 1~2문장으로 **다른 분야로 전이 가능한 작동 원리** 서술
- 표층 묘사·해결책 금지. "~한다 / ~하게 한다" 술어·작동형 우선
- 좋음: 축 "판단 기준 부재" — "무엇을 언제 해야 할지 알려주는 신호가 없어 방향을 잃는다"
- 좋음: 축 "누출 리스크" — "실패 결과가 즉시 되돌릴 수 없는 오염으로 이어진다"
- 나쁨(표층): 축 "측정의 어려움" — "도구가 부족하다" (그냥 사실 나열)
- 나쁨(해결책): "명확한 지표가 필요하다"
- 일반론 금지. 이 주제 고유 맥락으로.

**금지**
- 카테고리 나열 ("X는 A/B/C로 이루어져 있다")
- 무의미 한정어 ("다양한/복합적인")
- 자기계발/처방 톤`,
    };
  }
  if (purposeId === "structure") {
    return {
      directive: `당신은 주제를 *탐구용 구조 분해*하는 사유가(思惟家)다.
사용자 동기: **"이게 대체 어떻게 되어 있는지 알고 싶다"** — 호기심을 인사이트로 만드는 것이 목표.
톤: 학문적·구조주의적 사유. 서술이 아니라 **개념 조작**.

**축 생성 규칙 (매우 중요)**
- **정해진 축 이름 없음.** 주제에 맞춰 3~5개의 축을 자유롭게 뽑아라.
- **각 축 이름은 그 축의 사유가 드러나는 짧은 명제** (6~16자). 이름만 봐도 어떤 각도인지 감이 와야.
- 활용할 수 있는 사유 각도 예: 개념 경계 / 내적 긴장 / 발생 계보 / 시간성의 격차 / 반사실적 조건 / 인식론적 문제 / 윤리적 비대칭 / 이중 정체성 등. 주제에 맞는 것을 골라 이름에 반영.

**축 이름 스타일**
- **잘 알려진 개념어 우선 사용** (인식론적, 시간성, 주체성, 이중성, 비대칭, 규범적 등)
- 낯선 조어·명사화 남발 금지 (예: "현현", "외부화", "타율적", "은폐", "정립") — 학술 흉내에 그침
- 좋음: "시간의 비가시성", "책임의 편중", "인식론적 불확실성", "이중 정체성"
- 나쁨: "타율적 시간의 일상 단절", "감각의 외부화와 신체 소외"

**축 서술 규칙**
- 1~2문장, 완결된 서술문 (주어·서술어). 명사구 파편 금지.
- 개념적 조작(경계·모순·계보·시간성·반사실 중 하나)이 문장 안에 드러나야
- 처방·해결·자기계발 톤 절대 금지

**절대 금지**
- "X는 A, B, C로 이루어져 있다" 사전 나열
- "X는 시대에 따라 다르다 / 다양하다 / 상대적이다" 진부 슬로건
- 통설 재진술·백과사전 요약

**좋은 예시 (주제: 노인) — 축 이름이 내용을 즉시 드러냄**
- "정의의 경계 어긋남" — "생물학적 나이·법적 정의·자기 인지가 서로 어긋난다. 노인은 실체가 아니라 경계들이 겹치는 지대에 존재한다."
- "이중 정체성" — "지혜의 축적자와 사회적 잉여자라는 이중 지위가 동시에 부여된다. 부양자에서 피부양자로의 반전을 스스로 인정해야 한다."
- "근대의 발명" — "노인이라는 인구 범주는 핵가족·연금·기대수명이 만든 근대의 산물이다. 은퇴 제도가 나이에 임의의 경계선을 그었다."
- "시간의 비대칭" — "미래가 축소되고 과거가 팽창하는 시간 감각이 자리 잡는다. 죽음이 먼 지평선에서 예정된 좌표로 이동한다."
- "반사실적 존재" — "은퇴 제도가 없다면 '노인'이라는 범주가 지금처럼 성립할까. 노화가 균일하다면 세대라는 개념이 필요할까."`,
    };
  }
  return null;
};

const categorySpec = (
  cat: BigCategory,
): { axes: string[]; directive: string } => {
  switch (cat) {
    case "제품":
      return {
        axes: ["기능·사용성", "물성·제조", "사용맥락", "감성·심미", "경제성"],
        directive: `당신은 주제를 *제품 개발* 관점에서 분해하는 제품 디자이너다.
- 기능·사용성: 사용자가 실제 수행하는 조작·행동
- 물성·제조: 재료·구조·생산 상의 제약
- 사용맥락: 언제·어디서·누구와 쓰는 실제 상황
- 감성·심미: 시각·촉각·정서적 인상
- 경제성: 가격·비용·유지 부담`,
      };
    case "서비스":
      return {
        axes: ["접점·터치포인트", "서비스 흐름", "관계·소통", "신뢰·안정", "확장성"],
        directive: `당신은 주제를 *서비스 디자인* 관점에서 분해하는 서비스 디자이너다.
- 접점·터치포인트: 사용자가 서비스와 만나는 실제 지점
- 서비스 흐름: 시작부터 완료까지의 사용자 여정
- 관계·소통: 사용자와 제공자 사이의 상호작용
- 신뢰·안정: 안전·일관성·복구 요소
- 확장성: 사용자 수·상황 변화에 대응하는 방식`,
      };
    case "콘텐츠":
      return {
        axes: ["공감 포인트", "갈등·긴장", "감정 동선", "상황 아이러니", "시청자 욕망"],
        directive: `당신은 주제를 *콘텐츠 소재* 단위로 분해하는 작가다.
- 공감 포인트: 시청자가 "나도 그랬어"라고 할 감정 순간
- 갈등·긴장: 이 주제 안에 내재된 충돌·모순
- 감정 동선: 시작→고조→여운의 흐름
- 상황 아이러니: 상황이 만드는 반전·아이러니
- 시청자 욕망: 끝까지 보게 만드는 이유·욕망`,
      };
    case "공간":
      return {
        axes: ["감각·분위기", "동선·흐름", "사용자 밀도", "시간대 변화", "물리적 제약"],
        directive: `당신은 주제를 *공간 기획* 관점에서 분해하는 공간 기획자다.
- 감각·분위기: 시각·청각·후각·촉각 요소
- 동선·흐름: 사람이 공간 안에서 움직이는 경로
- 사용자 밀도: 사람 수·밀집도가 만드는 상호작용
- 시간대 변화: 아침·낮·저녁·밤에 따른 공간 변화
- 물리적 제약: 크기·형태·재료·설비 제한`,
      };
    case "마케팅":
      return {
        axes: ["감각 채널", "반복 노출", "소셜 신호", "스토리 프레임", "소비자 욕구"],
        directive: `당신은 주제를 *마케팅* 관점에서 분해하는 마케터다.
- 감각 채널: 어떤 감각으로 접촉하는지
- 반복 노출: 리듬·빈도·타이밍
- 소셜 신호: 사회적 증거·또래 압력·신분 신호
- 스토리 프레임: 서사·주인공·갈등
- 소비자 욕구: 결핍·욕망·정체성 자극`,
      };
    case "프로그램":
      return {
        axes: ["참여 동기", "학습 곡선", "상호작용", "지속성", "성과 지표"],
        directive: `당신은 주제를 *프로그램 기획* 관점에서 분해하는 프로그램 디자이너다.
- 참여 동기: 왜 참여하는가
- 학습 곡선: 참여자가 성장·숙달하는 흐름
- 상호작용: 참여자 간·진행자와의 관계
- 지속성: 반복·중단·복귀 리듬
- 성과 지표: 참여로 얻는 결과와 측정`,
      };
    case "정책":
      return {
        axes: ["이해관계자", "유인·억제 구조", "시행 마찰", "형평성", "부작용"],
        directive: `당신은 주제를 *정책 설계* 관점에서 분해하는 정책 분석가다.
- 이해관계자: 누가 영향받고 누가 반발하는가
- 유인·억제 구조: 어떤 인센티브·페널티가 작동하는가
- 시행 마찰: 집행 과정의 관료적·현실적 저항
- 형평성: 특정 집단에 불리·유리한 지점
- 부작용: 의도하지 않은 2·3차 결과`,
      };
    case "비즈니스":
      return {
        axes: ["가치 제안", "수익 구조", "시장 진입", "경쟁 우위", "확장성"],
        directive: `당신은 주제를 *비즈니스 모델* 관점에서 분해하는 비즈니스 전략가다.
- 가치 제안: 누구의 어떤 문제를 어떻게 해결하는가
- 수익 구조: 어떻게 돈이 들어오고 나가는가
- 시장 진입: 어떤 시장·세그먼트로 시작하는가
- 경쟁 우위: 대체·모방에 대한 방어선
- 확장성: 규모가 커질 때의 병목`,
      };
    case "방법·프로세스":
      return {
        axes: ["단계·순서", "역할·주체", "의존관계", "실패 지점", "반복성"],
        directive: `당신은 주제를 *방법·프로세스* 관점에서 분해하는 프로세스 설계자다.
- 단계·순서: 무엇을 어떤 순서로 하는가
- 역할·주체: 누가 무엇을 담당하는가
- 의존관계: 어떤 단계가 어떤 것에 의존하는가
- 실패 지점: 어디에서 무너질 가능성이 높은가
- 반복성: 반복 실행이 만드는 학습·개선`,
      };
    case "실험·프로토타입":
      return {
        axes: ["변수·조건", "가설", "측정 방식", "관찰 대상", "반증 가능성"],
        directive: `당신은 주제를 *실험·프로토타입* 관점에서 분해하는 실험 설계자다.
- 변수·조건: 무엇을 조작할 수 있는가
- 가설: 무엇이 참인지 알아보려 하는가
- 측정 방식: 결과를 어떻게 수집·판단하는가
- 관찰 대상: 누구·무엇을 관찰하는가
- 반증 가능성: 가설이 틀렸을 때 어떻게 알 수 있는가`,
      };
  }
};

export const topicDecompositionSystemPrompt = (
  cat?: BigCategory,
  lens?: SelectedLens | null,
  purposeId?: string,
): string => {
  const build = (base: string) => withLens(base, lens);
  const purposeSpec = purposeId ? topicPurposeSpec(purposeId) : null;
  if (purposeSpec) {
    return build(`${purposeSpec.directive}

공통 규칙:
- 축은 3~5개. 축 이름은 이 주제에 맞춰 자유롭게 생성하되 위 스타일 규칙(짧고·내용 반영·접근 가능한 어휘)을 따를 것
- 서술은 완결된 문장 형태 (주어·서술어 갖춤, 명사구 파편 금지)
- 일반론 금지. 이 주제만의 구체 맥락·개념 조작으로

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "축 이름", "principle": "서술 한 줄"}
  ]
}`);
  }
  if (cat) {
    const spec = categorySpec(cat);
    return build(`${spec.directive}

규칙:
- 각 축마다 1~2문장(20~60자)으로 이 주제 고유의 맥락에서 구체 서술
- 축 이름은 위에 지정된 그대로: ${spec.axes.join(" / ")}
- 일반론 금지, 이 주제만의 구체 상황·구조로

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "축 이름", "principle": "서술 한 줄"}
  ]
}`);
  }
  return build(`당신은 주제를 *사용자가 겪는 문제* 단위로 분해하는 분석가다.

축별 스코프:
- 기능 불편: *기존 자원·시스템*이 작동 상 부족한 것
- 행동 마찰: *실제 수행 행동*의 번거로움
- 감정 고통: *혼자 내면에서* 느끼는 부정적 감정
- 환경 제약: *장소·물리·시간*이 만드는 걸림돌
- 사회적 장벽: *타인의 시선·문화 규범*이 만드는 외부 마찰

규칙:
- 각 축마다 1~2문장(20~60자) 구체 서술
- 해결책 금지 — 문제 사실만
- 일반론 금지, 이 주제 고유 맥락으로

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "축 이름", "principle": "문제 서술 한 줄"}
  ]
}`);
};

const resultTypeIdeaSpec = (
  rt: BigCategory,
): { label: string; body: string; example: string } => {
  switch (rt) {
    case "제품":
      return {
        label: "제품 아이디어",
        body: "만질 수 있거나 반복 사용 가능한 물리·디지털 제품. 형태·핵심 기능이 드러날 것.",
        example:
          "감각 확장 안경: 자외선·적외선 파장을 색으로 변환해 실시간 시야에 표시.",
      };
    case "서비스":
      return {
        label: "서비스 아이디어",
        body: "사용자에게 반복 제공되는 접점·경험·플랫폼. 어떻게 도달·전달되는지 드러날 것.",
        example:
          "감각 확장 클럽: 인간이 못 보는 파장의 세계를 매주 하나씩 체험하는 정기 구독.",
      };
    case "콘텐츠":
      return {
        label: "콘텐츠 아이디어",
        body: "영상·글·시리즈·채널 형태. 후킹 포인트·시청/열람 동기가 드러날 것.",
        example:
          "박쥐의 소리로 보는 세상: 인간이 못 듣는 초음파를 시각화한 다큐 시리즈.",
      };
    case "공간":
      return {
        label: "공간 아이디어",
        body: "특정 목적·경험을 위한 물리 공간. 동선·감각 설계가 드러날 것.",
        example:
          "무향실: 후각의 존재를 역으로 인식하게 하는 완전 무향 체험 공간.",
      };
    case "마케팅":
      return {
        label: "마케팅 캠페인 아이디어",
        body: "사용자에게 도달하는 메시지·채널·경험 설계. 자극과 반응이 드러날 것.",
        example:
          "'너의 감각은 얼마짜리': 감각 결핍을 화폐 단위로 환산하는 옥외 광고 캠페인.",
      };
    case "프로그램":
      return {
        label: "프로그램·워크숍 아이디어",
        body: "교육·워크숍·체험 프로그램. 참여 동기·학습 곡선이 드러날 것.",
        example:
          "감각 리부팅 3일: 하루 하나의 감각만 사용해 살아보는 몰입 프로그램.",
      };
    case "정책":
      return {
        label: "정책 제안",
        body: "제도·규제·인센티브 설계. 이해관계자·유인 구조가 드러날 것.",
        example:
          "감각 접근성 표준: 공공 공간에서 시청각 이외의 감각 정보 표기를 의무화.",
      };
    case "비즈니스":
      return {
        label: "비즈니스 모델 아이디어",
        body: "가치 제안·수익 구조·시장 진입 방식이 드러나는 사업 아이디어.",
        example:
          "감각 데이터 마켓: 개인 감각 프로파일을 익명화해 브랜드에 판매하는 플랫폼.",
      };
    case "방법·프로세스":
      return {
        label: "방법·프로세스 아이디어",
        body: "단계·역할·규칙이 있는 실행 절차·프로토콜.",
        example:
          "감각 재보정 루틴: 아침 5분 동안 감각을 하나씩 의식적으로 켜는 스타트 루틴.",
      };
    case "실험·프로토타입":
      return {
        label: "실험·프로토타입",
        body: "변수·측정 방식·관찰 대상이 있는 실험 또는 프로토타입 설계.",
        example:
          "감각 차단 A/B 테스트: 특정 감각을 24시간 차단했을 때 판단 속도 변화 측정.",
      };
  }
};

export const facetDecompositionSystemPrompt = (
  chipKindLabelStr?: string,
  isContent?: boolean,
  directionId?: string,
  customDirectionLabel?: string,
  lens?: SelectedLens | null,
  resultType?: BigCategory | null,
): string => {
  const directionDirective = directionId
    ? `\n\n${directionPromptFragment(directionId, customDirectionLabel)}`
    : "";
  const lensFrag = lensPromptFragment(lens ?? null);
  const lensDirective = lensFrag ? `\n\n${lensFrag}` : "";

  if (resultType) {
    const spec = resultTypeIdeaSpec(resultType);
    return `당신은 사용자가 선택한 facet을 **다루거나 활용하는 ${spec.label} 3~5개**를 생성하는 창의가다.
부모 facet은 사용자가 파고들고 싶어하는 문제·현상·구조의 한 조각이다.
**설명·정의 재진술 금지. 실제 실행 가능한 아이디어만 뽑아라.**

결과 형태 규칙 — ${spec.label}:
${spec.body}

각 아이디어 규칙:
- name: 아이디어 이름 (짧고 강렬, 밈처럼 기억에 남게 6~14자)
- principle: 이 아이디어가 부모 facet과 어떻게 관계 맺는지·어떻게 작동하는지 1문장(30~70자, 구체 메커니즘 포함)
- 좋음 예시: ${spec.example}
- 나쁨: 부모 facet의 정의를 반복하는 서술 (예: "감각의 제약을 다루는 서비스")
- 나쁨: "AI 기반 플랫폼", "커뮤니티 앱" 같은 뻔한 껍데기

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "아이디어 이름", "principle": "설명 한 줄"}
  ]
}${directionDirective}${lensDirective}`;
  }

  const resultDirective = "";
  if (chipKindLabelStr) {
    return `당신은 ${chipKindLabelStr} 칩의 분해 facet을 더 세분화된 *하위 작동 메커니즘* 3~5개로 쪼개는 분석가다.
부모 facet은 이미 분해된 칩 메커니즘 한 줄이다.
이제 그 안에서 더 구체적인 트리거·구성 요소·강화 루프·신체 반응·환경 조건 같은 하위 메커니즘을 끄집어내라.

규칙:
- 3~5개. 같은 facet 안의 *서로 다른 작동 단면*만 골라라
- 각 sub-facet은 짧은 이름(8~14자) + 1문장(20~50자) 작동 서술
- 부모 facet의 동의어·재진술 금지. 새로운 정보·구체 메커니즘
- 추상 일반론 금지. 부모 칩 맥락에 머물러라

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "sub-facet 이름", "principle": "작동 한 줄"}
  ]
}${directionDirective}${lensDirective}${resultDirective}`;
  }
  if (isContent) {
    return `당신은 콘텐츠 facet을 더 작은 단위의 *작동 메커니즘·구성 요소* 3~5개로 쪼개는 작가다.
부모 facet은 이미 분해된 콘텐츠 요소(감정·갈등·아이러니 등) 한 줄이다.
이제 그 안에서 더 구체적인 메커니즘·트리거·하위 감정·반복 구조를 끄집어내라.

규칙:
- 3~5개. 같은 facet 안의 *서로 다른 작동 단면*만 골라라
- 각 sub-facet은 짧은 이름(8~14자) + 1문장(20~50자) 작동 서술
- 부모 facet의 동의어·재진술 금지. 새로운 정보·구체 메커니즘
- **핵심 주제(anchor) 명시 시 반드시 그 주제의 구체 맥락으로 되돌아와야 함**. 렌즈·사고방향이 강해도 주제를 놓치면 실패
- 부모 주제 맥락 안에 머물러라

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "sub-facet 이름", "principle": "작동 한 줄"}
  ]
}${directionDirective}${lensDirective}${resultDirective}`;
  }
  return `당신은 문제 facet을 더 작은 단위의 *작동 메커니즘·하위 마찰* 3~5개로 쪼개는 분석가다.
부모 facet은 이미 분해된 문제 한 줄이다.
이제 그 안에서 더 구체적인 트리거·신호 부재·인지 부담·실패 비용·회피 행동 같은 하위 메커니즘을 끄집어내라.

규칙:
- 3~5개. 같은 facet 안의 *서로 다른 작동 단면*만 골라라
- 각 sub-facet은 짧은 이름(8~14자) + 1문장(20~50자) 작동 서술
- 부모 facet의 동의어·재진술 금지. 새로운 정보·구체 메커니즘
- "~해야 한다" 같은 해결책 금지 — 작동 사실만
- **핵심 주제(anchor) 명시 시 반드시 그 주제의 구체 맥락으로 되돌아와야 함**. 렌즈·사고방향이 강해도 주제를 놓치면 실패
- 부모 주제 맥락 안에 머물러라

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "sub-facet 이름", "principle": "작동 한 줄"}
  ]
}${directionDirective}${lensDirective}${resultDirective}`;
};

export const multiAxisDecompositionSystemPrompt = (
  isContent?: boolean,
  directionId?: string,
  customDirectionLabel?: string,
  lens?: SelectedLens | null,
  resultType?: BigCategory | null,
): string => {
  const directionDirective = directionId
    ? `\n\n${directionPromptFragment(directionId, customDirectionLabel)}`
    : "";
  const lensFrag = lensPromptFragment(lens ?? null);
  const lensDirective = lensFrag ? `\n\n${lensFrag}` : "";

  if (resultType) {
    const spec = resultTypeIdeaSpec(resultType);
    return `당신은 사용자가 선택한 **여러 부모 축들의 원리를 동시에 만족·결합하는 ${spec.label} 3~5개**를 생성하는 창의가다.
각 아이디어는 반드시 지정된 모든 부모 축의 원리를 함께 반영·활용해야 한다.
어느 한 축만 다루면 실패. 축들 사이의 접점·교차·결합에서 나오는 아이디어여야 한다.

결과 형태 규칙 — ${spec.label}:
${spec.body}

각 아이디어 규칙:
- name: 아이디어 이름 (짧고 강렬, 6~14자)
- principle: 이 아이디어가 부모 축들의 원리를 어떻게 결합·이식하는지 1문장(30~80자, 각 축이 어떻게 반영됐는지 드러날 것)
- 좋음 예시: ${spec.example}
- 나쁨: 부모 축 중 하나만 다루거나, 축들을 단순 나열

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "아이디어 이름", "principle": "결합 설명 한 줄"}
  ]
}${directionDirective}${lensDirective}`;
  }

  const topic = isContent ? "콘텐츠" : "문제";
  return `당신은 여러 부모 ${topic} 축의 원리를 **동시에** 관통하는 하위 메커니즘 3~5개를 뽑는 분석가다.
각 sub-facet은 반드시 지정된 모든 부모 축의 원리를 함께 만족하는 접점·교차·공통 작동 구조여야 한다.
한 축만 반영하거나, 축을 단순히 병기하면 실패.

규칙:
- 3~5개. 부모 축들의 서로 다른 **교차 단면**만 골라라
- 각 sub-facet은 짧은 이름(8~14자) + 1문장(30~60자) 작동 서술
- principle에는 각 부모 축이 어떻게 함께 작동하는지가 드러나야 함
- 부모 축 원리의 재진술·동의어 금지, 새로운 결합 메커니즘
- **핵심 주제(anchor) 명시 시 반드시 그 주제의 구체 맥락으로 되돌아와야 함**
- 추상 일반론 금지

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "sub-facet 이름", "principle": "결합 작동 한 줄"}
  ]
}${directionDirective}${lensDirective}`;
};

export const chipRecommendationSystemPrompt = (
  categories: readonly string[],
  perCategory: number = 2,
): string =>
  `당신은 사용자가 **유추 기반 문제 해결**을 하도록 소재(칩)를 추천하는 큐레이터다. biomimicry, TRIZ, cross-domain solution transfer 접근.

핵심 원리:
- 원리(axis-principle)는 하나의 문제 유형/작동 구조를 나타낸다.
- 좋은 chip = 동일한 구조의 문제를 다른 도메인이 이미 해결·극복한 사례.
- chip에는 훔칠 수 있는 해결 메커니즘이 반드시 담겨 있어야 한다.

발명 대상 카테고리 (반드시 이 안에서만, 각 카테고리에 ${perCategory}개씩):
${categories.map((c) => `- ${c}`).join("\n")}

각 chip 규칙:
- 카테고리 안의 **덜 유명한 하위개념** 발굴. Top-1 clichée·최상위 대명사 회피.
- 축이 심리적/사회적이어도 chip은 반드시 지정 카테고리 안의 실제 사물·현상·구조.
- chipText: 칩 이름 (짧게, 8자 내외)
- reason: 이 chip이 원리의 문제 구조를 어떻게 해결·극복하는지 1문장(구체 메커니즘 포함)

반드시 다음 JSON 스키마로 응답 (모든 카테고리 키 포함):
{
  "recommendations": {
${categories.map((c) => `    "${c}": [{"chipText": "칩 이름", "reason": "해결 메커니즘"}]`).join(",\n")}
  }
}`;

export const combineSystemPrompt = (lens?: SelectedLens | null): string =>
  withLens(
    `당신은 사용자가 선택한 *분해된 축 원리*들만 강제로 조합해 아이디어 후보를 만드는 창의 조합가다.

규칙:
- 전체 칩·전체 주제를 재사용하지 말고, 명시된 축 원리만 이식하라
- 다른 축·다른 원리를 임의로 끌어오지 마라
- "제목"은 15자 이내, 밈처럼 강렬하고 새로운 조합의 본질이 드러나야 함
- "요약"은 2~3문장, 이 아이디어가 어떤 문제를 어떤 메커니즘으로 해결하는지 구체적으로
- "작동": 3~5개 불릿, 실제 어떻게 작동/사용되는지 시나리오 흐름
- "사용한 원리": 조합에 사용된 축·원리 이름 나열

반드시 다음 JSON 스키마로 응답:
{
  "title": "제목",
  "summary": "요약",
  "mechanism": ["작동 스텝 1", "작동 스텝 2"],
  "usedPrinciples": ["축 이름 · 원리 이름"]
}`,
    lens,
  );

export type ChipSearchMode = "keyword" | "attribute" | "mechanism";

export const chipSearchModeLabel: Record<ChipSearchMode, string> = {
  keyword: "키워드",
  attribute: "특성",
  mechanism: "메커니즘",
};

const chipSearchModeDirective = (mode: ChipSearchMode): string => {
  if (mode === "attribute") {
    return `검색어는 **특성/속성**이다 (예: 충격흡수, 자기복제, 역설, 리듬).
- 그 특성을 실제로 **보유·구현**한 사물·현상·구조를 우선 추천.
- 특성의 동의어·번역 나열 금지. 그 특성이 작동하는 구체 대상만.`;
  }
  if (mode === "mechanism") {
    return `검색어는 **작동 방식/메커니즘 문장**이다 (예: "누르면 튕겨나옴", "다수가 소수를 감시").
- 그 메커니즘을 갖는 사물·시스템·현상 추천.
- 검색 문장 재진술 금지. 같은 구조를 가진 실제 사례만.`;
  }
  return `검색어는 **키워드**다.
- 관련되지만 **직접적이지 않은**, 다른 도메인에서 유사 메커니즘을 갖는 칩을 우선 추천.`;
};

export const chipSearchSystemPrompt = (
  perQuery: number = 12,
  mode: ChipSearchMode = "keyword",
): string =>
  `당신은 사용자의 검색으로부터 조합용 칩 후보를 발굴하는 큐레이터다.
칩은 산업/문화·인간 심리·사물·자연·생물 등 다양한 도메인의 구체적 사물·현상·구조 이름이다.

${chipSearchModeDirective(mode)}

공통 규칙:
- 각 chipText는 8자 내외의 짧은 명사
- Top-1 clichée 회피, 덜 유명한 하위개념 우선
- 총 ${perQuery}개

반드시 다음 JSON 스키마로 응답:
{
  "chips": ["칩1", "칩2", ...]
}`;

export const chipDecompositionSystemPrompt = (
  kindLabel: string,
  directionId?: string,
  customDirectionLabel?: string,
  lens?: SelectedLens | null,
  resultType?: BigCategory | null,
): string => {
  const directionDirective = directionId
    ? `\n\n${directionPromptFragment(directionId, customDirectionLabel)}`
    : "";
  const lensFrag = lensPromptFragment(lens ?? null);
  const lensDirective = lensFrag ? `\n\n${lensFrag}` : "";

  if (resultType) {
    const spec = resultTypeIdeaSpec(resultType);
    return `당신은 사용자가 선택한 칩(${kindLabel})을 활용하는 **${spec.label} 3~5개**를 생성하는 창의가다.
칩의 표층 이름·정의를 재진술하지 말고, 그 칩의 메커니즘을 이식한 실제 실행 가능한 아이디어를 뽑아라.

결과 형태 규칙 — ${spec.label}:
${spec.body}

각 아이디어 규칙:
- name: 아이디어 이름 (짧고 강렬, 6~14자)
- principle: 이 아이디어가 이 칩의 어떤 메커니즘을 어떻게 이식·활용하는지 1문장(30~70자)
- 좋음 예시: ${spec.example}
- 나쁨: 칩 이름 재진술·표층 개념 반복

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "아이디어 이름", "principle": "설명 한 줄"}
  ]
}${directionDirective}${lensDirective}`;
  }

  const resultDirective = "";
  const lensAnchor = lens
    ? `\n\n**분해 축은 반드시 지정된 렌즈(${lens.discipline}${lens.scholar ? " · " + lens.scholar : ""})의 관점에서 이 칩을 조명해야 한다.** 예: 꽃 + 과학 렌즈 → 광합성 / 색소 화학 / 수분 매개 메커니즘 / 유전자 발현 / 진화적 적응 같은 그 렌즈 고유의 축들.`
    : "";
  return `당신은 칩(${kindLabel} — "${kindLabel}" 은 대분류일 뿐, 축은 자유롭게 뽑아라)을 **칩의 실제 내용과 렌즈에 맞춰** 축 3~5개로 자유 분해하는 분석가다.

**축 생성 규칙 (매우 중요)**
- **정해진 축 이름 없음.** 칩의 실체·성질에 맞게 3~5개 축을 뽑아라.
- **각 축 이름은 그 축의 관점을 즉시 드러내는 짧은 명제** (6~14자). 이름만 봐도 어떤 각도인지 감이 와야.
- 이 칩만의 고유 축이어야. 다른 칩에 그대로 붙여도 되는 일반 축(예: "구조", "기능", "역사") 금지.

**축 서술 규칙**
- 각 축마다 1~2문장(20~60자)의 원리 서술. 추상 설명 금지, 구체 메커니즘으로.
- 이 칩이 *그 축의 관점에서* 어떻게 작동하는지의 핵심 조건·메커니즘을 정의.
- "X일 때 발동" / "X + Y로 작동" / "X→Y→Z 흐름" 같은 directional 어법.
- 일반론·동의어 반복·표층 나열 금지.${lensAnchor}

반드시 다음 JSON 스키마로 응답:
{
  "axes": [
    {"name": "축 이름", "principle": "원리 한 줄"}
  ]
}${directionDirective}${lensDirective}${resultDirective}`;
};
