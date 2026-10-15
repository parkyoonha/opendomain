import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import {
  facetDecompositionSystemPrompt,
  topicDecompositionSystemPrompt,
} from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";
import { DEFAULT_DIRECTION_ID } from "@/lib/directions";

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

  // A user is "customizing" the first decompose when they picked a
  // non-default direction, a result-type chip, or typed extra context.
  // In that case we switch to the facet prompt engine (same one the
  // sub-facet route uses) so the picks actually shape the output.
  const customizedDirection =
    !!body.directionId &&
    body.directionId !== "none" &&
    body.directionId !== DEFAULT_DIRECTION_ID;
  const customized =
    customizedDirection || !!body.resultType || !!body.userContext?.trim();

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
  const user = customized
    ? `부모 축: 주제\n부모 facet: ${topic}${directionLine}${lensLine}${resultLine}${userContextLine}`
    : `주제: ${topic}${purposeLine}${lensLine}${userContextLine}`;

  const tier = body.purposeId === "structure" ? "flash" : "flash";
  const temperature = body.purposeId === "structure" ? 0.95 : 0.7;

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, tier),
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
