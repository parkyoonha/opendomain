import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { facetDecompositionSystemPrompt } from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
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
  const user = `${rootLine ? rootLine + "\n\n" : ""}부모 축: ${parentAxis}\n부모 facet: ${parentPrinciple}${directionLine}${lensLine}${resultLine}`;

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
