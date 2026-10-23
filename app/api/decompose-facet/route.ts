import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { facetDecompositionSystemPrompt } from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
import { isExpandDirection } from "@/lib/directions";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Body = {
  parentAxis?: string;
  parentPrinciple?: string;
  rootTopic?: string;
  bigCategory?: BigCategory;
  directionId?: string;
  directionLabel?: string;
  lens?: SelectedLens | null;
  resultType?: BigCategory | null;
  userContext?: string;
};

export async function POST(req: Request) {
  const userGeminiKey = req.headers.get("x-user-gemini-key");
  const choice = pickProvider(userGeminiKey);
  if ("error" in choice) {
    return NextResponse.json({ error: choice.error }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parentAxis = body.parentAxis?.trim();
  const parentPrinciple = body.parentPrinciple?.trim();
  if (!parentAxis || !parentPrinciple) {
    return NextResponse.json(
      { error: "parentAxis and parentPrinciple are required" },
      { status: 400 },
    );
  }

  const system = facetDecompositionSystemPrompt(
    undefined,
    body.bigCategory === "콘텐츠",
    body.directionId,
    body.directionLabel,
    body.lens,
    body.resultType,
  );
  const directionLine = body.directionId
    ? `\n사고 방향: ${body.directionLabel ?? body.directionId}`
    : "";
  const lensLine = body.lens
    ? `\n렌즈: ${body.lens.discipline}${body.lens.scholar ? ` · ${body.lens.scholar}` : ""}`
    : "";
  const resultLine = body.resultType ? `\n실행 결과: ${body.resultType}` : "";
  // counter and emotion legitimately deviate from strict "return to topic"
  // framing (counter opposes it, emotion strips off topic-level concepts for
  // raw sensation). Others (principle/interpretation/question/expansion)
  // benefit from a strong topic anchor.
  const directionOverridesAnchor =
    body.directionId === "counter" || body.directionId === "emotion";
  const rootLine = body.rootTopic
    ? directionOverridesAnchor
      ? `\n주제 도메인: ${body.rootTopic} (사고 방향의 규칙이 최우선. 이 도메인 어휘를 사용하되 주제를 문자 그대로 재진술하지 말 것)`
      : `\n**핵심 주제 (anchor): ${body.rootTopic}** — 모든 sub-facet은 반드시 이 주제의 구체 맥락으로 되돌아와야 한다. 추상 개념·렌즈에만 매달려 주제를 놓치면 실패.`
    : "";
  const userContextLine = body.userContext?.trim()
    ? `\n\n**사용자 추가 지시 (최우선 제약)**: ${body.userContext.trim()}`
    : "";
  const expanding = isExpandDirection(body.directionId);
  const user = expanding
    ? `출발 facet: ${parentAxis} — ${parentPrinciple}${directionLine}${lensLine}${userContextLine}

위 facet을 **발판 삼아** 사고 방향이 지정한 담당 영역에서 **인접 주제 3~5개**를 끌어와라. 사고 방향의 "담당 영역 (엄격 경계)"를 **반드시** 지켜라 — 영역을 넘으면 FAIL.

🚨 **자가 체크 (각 결과물마다 반드시 통과)**:
1. 각 name이 **사고 방향이 지정한 담당 영역**의 재료인가? (역사 사건 ↔ 비역사 도메인 ↔ 학자 분석 개념 ↔ 학자 반대 입장 ↔ 현재 운동/법 ↔ 거시 체제 — 혼동 금지)
2. 각 name이 **고유명사(지명/인명/사건명/연도/체제명/개념어)**를 포함하는가?
3. "~ 패턴" / "~ 메커니즘" / "~ 재편" / "~ 국면" / "~ 주기" 같은 추상 범주 즉시 FAIL
4. 각 principle이 **평행·대립·파급·수입 지점 + 갈라짐 지점**을 둘 다 담았는가?

위 체크를 통과하지 못한 항목은 즉시 재작성. 모든 facet의 깊이는 균일할 것 — 첫 facet만 간단하면 FAIL.`
    : `${rootLine ? rootLine + "\n\n" : ""}부모 축: ${parentAxis}\n부모 facet: ${parentPrinciple}${directionLine}${lensLine}${resultLine}${userContextLine}`;

  // Flash across the board — see decompose-topic for rationale.
  const tier = body.resultType ? "flash" : "lite";
  // counter (반박) needs strict adherence to the "disagree with parent"
  // instruction — high temperature lets haiku drift into elaboration.
  const temperature = body.resultType
    ? 0.95
    : body.directionId === "counter"
      ? 0.3
      : 0.7;

  // Validation: counter direction requires names to start with a negation
  // token. If haiku returns agreement-style names, we retry once with an
  // explicit correction message.
  const COUNTER_NEGATION_PATTERNS = [
    /^(?:.+)(?:이|가|은|는)?\s*아니다/,
    /^오히려\s+/,
    /^반대로\s+/,
    /^실제로는?\s+/,
    /(?:은|는)\s+착시/,
    /(?:은|는)\s+신화/,
    /(?:은|는)\s+과장/,
    /(?:은|는)\s+틀렸다/,
    /(?:은|는)\s+오해/,
    /(?:은|는)\s+허구/,
  ];
  const validateCounter = (
    subFacets: Record<string, string>,
  ): { ok: boolean; badNames: string[] } => {
    const names = Object.keys(subFacets);
    if (names.length === 0) return { ok: false, badNames: [] };
    const badNames = names.filter(
      (n) => !COUNTER_NEGATION_PATTERNS.some((p) => p.test(n)),
    );
    return { ok: badNames.length <= Math.floor(names.length / 2), badNames };
  };

  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, tier),
      temperature,
      messages,
    });
    let subFacets = parseAxesJson(content);

    if (body.directionId === "counter") {
      const check = validateCounter(subFacets);
      if (!check.ok) {
        // Retry once with correction message and lower temperature.
        const correction = `이전 응답이 부모 facet에 반대하지 않고 오히려 강화·심화했다. 다시 답하되, 각 name은 반드시 다음 형식 중 하나로 시작한다:
- "~는 아니다" / "~가 아니다"
- "오히려 ~"
- "반대로 ~"
- "실제로는 ~"
- "~는 착시/신화/과장/오해/허구"
- "~는 틀렸다"

부모 facet ("${parentPrinciple}") 의 주장에 정면 반대하는 3~5개 명제만 반환. 심화·확장·연쇄 결과 절대 금지.`;
        const retryContent = await callLLM({
          provider: choice.provider,
          apiKey: choice.apiKey,
          model: modelFor(choice.provider, tier),
          temperature: 0.2,
          messages: [
            ...messages,
            { role: "assistant" as const, content },
            { role: "user" as const, content: correction },
          ],
        });
        const retrySubFacets = parseAxesJson(retryContent);
        const retryCheck = validateCounter(retrySubFacets);
        // Use retry only if it improved.
        if (retryCheck.ok || retryCheck.badNames.length < check.badNames.length) {
          subFacets = retrySubFacets;
        }
      }
    }

    return NextResponse.json({ subFacets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
