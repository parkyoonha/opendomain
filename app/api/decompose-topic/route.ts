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

**사전 단계 (내부 추론)**: 이 주제의 핵심 구조적 긴장을 1문장으로 식별하라. 그 긴장을 **지금 선택된 사고 방향의 담당 영역**에서 뽑는다. 사고 방향의 "담당 영역 (엄격 경계)"를 **반드시** 지켜라 — 영역을 넘으면 FAIL.

🚨 **자가 체크 (각 결과물마다 반드시 통과)**:
1. 각 name이 **사고 방향이 지정한 담당 영역**의 재료인가? (역사 사건 ↔ 비역사 도메인 ↔ 학자 분석 개념 ↔ 학자 반대 입장 ↔ 현재 운동/법 ↔ 거시 체제 — 혼동 금지)
2. 각 name이 **고유명사(지명/인명/명명된 사건/연도/체제명/개념어)**를 포함하는가?
3. "~적 영향" / "~의 재편" / "~ 패턴" / "~ 메커니즘" / "~ 국면" 같은 **추상 범주형은 즉시 FAIL**
4. 각 principle이 **평행·대립·파급·수입 지점 + 갈라짐 지점**을 둘 다 담았는가?

위 체크를 통과하지 못한 항목은 즉시 재작성. 모든 facet의 깊이는 균일할 것 — 첫 facet만 간단하면 FAIL.`
      : `부모 축: 주제\n부모 facet: ${topic}${directionLine}${lensLine}${resultLine}${userContextLine}`
    : `주제: ${topic}${purposeLine}${lensLine}${userContextLine}`;

  // Keep flash tier for all paths. Sonnet upgrade didn't improve adherence
  // meaningfully — rolling back and pushing prompt-side constraints instead.
  const tier = body.purposeId === "structure" ? "flash" : "flash";
  // Match decompose-facet's expand temperature (0.7). Higher temps on the
  // topic-level route produced quality drift — first-of-3 facet came out
  // too thin while facet-route siblings stayed consistent.
  const temperature = body.purposeId === "structure" ? 0.95 : 0.7;
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
