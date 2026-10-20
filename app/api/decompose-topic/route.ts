import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import {
  facetDecompositionSystemPrompt,
  topicDecompositionSystemPrompt,
} from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";
import { DEFAULT_DIRECTION_ID, isExpandDirection } from "@/lib/directions";

export const runtime = "nodejs";

type Body = {
  topicText?: string;
  bigCategory?: BigCategory;
  lens?: SelectedLens | null;
  purposeId?: string;
  // User-selected customization on the pending-topic card. When any of
  // these are non-default we route through facetDecompositionSystemPrompt
  // (same engine the sub-facet route uses) so the first decompose honors
  // the picked direction / result-type / custom context.
  directionId?: string;
  directionLabel?: string;
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

  const topic = body.topicText?.trim();
  if (!topic) {
    return NextResponse.json({ error: "topicText is required" }, { status: 400 });
  }

  // Route through the facet prompt engine (same one the sub-facet
  // route uses) whenever any slot of the controller is non-default.
  // DEFAULT_DIRECTION_ID itself ("principle") still falls through to
  // the facet prompt — picking "원리" explicitly should still produce
  // its direction-shaped output rather than silently reverting to the
  // generic topic prompt, which was why chip picks on the first
  // controller sometimes looked like default output.
  const hasDirection =
    !!body.directionId && body.directionId !== "none";
  const customized =
    hasDirection || !!body.resultType || !!body.userContext?.trim();
  const customizedDirection = hasDirection;

  const system = customized
    ? facetDecompositionSystemPrompt(
        undefined,
        body.bigCategory === "콘텐츠",
        body.directionId,
        body.directionLabel,
        body.lens,
        body.resultType,
      )
    : topicDecompositionSystemPrompt(
        body.bigCategory,
        body.lens,
        body.purposeId,
      );

  const lensLine = body.lens
    ? `\n렌즈: ${body.lens.discipline}${body.lens.scholar ? ` · ${body.lens.scholar}` : ""}`
    : "";
  const purposeLine = body.purposeId ? `\n사고 목적: ${body.purposeId}` : "";
  const directionLine = customizedDirection
    ? `\n사고 방향: ${body.directionLabel ?? body.directionId}`
    : "";
  const resultLine = body.resultType ? `\n실행 결과: ${body.resultType}` : "";
  const userContextLine = body.userContext?.trim()
    ? `\n\n**사용자 추가 지시 (최우선 제약)**: ${body.userContext.trim()}`
    : "";
  // When customized, present the topic as the facet-prompt engine expects
  // ("부모 facet"). Otherwise keep the historic "주제: ..." framing.
  // For expansion, re-word to "출발 주제" so the user message doesn't
  // bias the LLM toward "break this parent into parts" semantics; the
  // system prompt already re-frames the task but repeating the shift
  // here makes it stick.
  const expanding = isExpandDirection(body.directionId);
  const user = customized
    ? expanding
      ? `출발 주제: ${topic}${directionLine}${lensLine}${userContextLine}

위 주제를 **발판 삼아** 다른 도메인·시대·학문의 **인접 주제 3~5개**를 끌어와라.

🚨 **자가 체크 (뽑기 전 반드시 통과)**:
각 name이 **고유명사(지명/인명/명명된 사건/연도)**를 포함하는가?
- "산업혁명 패턴" ❌ (추상 범주)
- "사회 재편 메커니즘" ❌ (추상 범주)
- "불평등 심화 국면" ❌ (추상 범주)
- "러다이트 봉기(1811)" ✓ (사건명+연도)
- "엔클로저 운동(16~19C)" ✓ (운동명+시대)
- "소련 전시공산주의(1918-21)" ✓ (국가+체제+연도)
- "케인스의 '손주들에게'(1930)" ✓ (학자+저작+연도)

위 "✓ 형식"만 통과시키고, "❌ 형식"은 즉시 재작성하라.`
      : `부모 축: 주제\n부모 facet: ${topic}${directionLine}${lensLine}${resultLine}${userContextLine}`
    : `주제: ${topic}${purposeLine}${lensLine}${userContextLine}`;

  // Keep flash tier for all paths. Sonnet upgrade didn't improve adherence
  // meaningfully — rolling back and pushing prompt-side constraints instead.
  const tier = body.purposeId === "structure" ? "flash" : "flash";
  // Expand: slight temperature bump to encourage specific recall over safe
  // category names. Normal direction keeps the historical 0.7.
  const temperature = expanding
    ? 0.85
    : body.purposeId === "structure"
      ? 0.95
      : 0.7;
  const resolvedModel = modelFor(choice.provider, tier);
  console.log(
    `[decompose-topic] provider=${choice.provider} tier=${tier} model=${resolvedModel} expanding=${expanding} direction=${body.directionId ?? "-"} temp=${temperature}`,
  );

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: resolvedModel,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const axes = parseAxesJson(content);
    return NextResponse.json({ axes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
