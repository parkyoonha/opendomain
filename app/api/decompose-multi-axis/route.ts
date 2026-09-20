import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { multiAxisDecompositionSystemPrompt } from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type ParentAxis = { axis: string; principle: string };

type Body = {
  parents?: ParentAxis[];
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

  const parents = (body.parents ?? []).filter(
    (p) => p?.axis?.trim() && p?.principle?.trim(),
  );
  if (parents.length < 2) {
    return NextResponse.json(
      { error: "다축 결합 분해는 축이 2개 이상 필요합니다." },
      { status: 400 },
    );
  }

  const system = multiAxisDecompositionSystemPrompt(
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
  const directionOverridesAnchor =
    body.directionId === "counter" || body.directionId === "emotion";
  const rootLine = body.rootTopic
    ? directionOverridesAnchor
      ? `\n주제 도메인: ${body.rootTopic} (사고 방향의 규칙이 최우선. 이 도메인 어휘를 사용하되 주제를 문자 그대로 재진술하지 말 것)`
      : `\n**핵심 주제 (anchor): ${body.rootTopic}** — 모든 sub-facet은 반드시 이 주제의 구체 맥락으로 되돌아와야 한다.`
    : "";
  const parentBlock = parents
    .map((p, i) => `${i + 1}) ${p.axis} — ${p.principle}`)
    .join("\n");
  const user = `${rootLine ? rootLine + "\n\n" : ""}결합할 부모 축 (${parents.length}개):\n${parentBlock}${directionLine}${lensLine}${resultLine}`;

  const tier = body.resultType ? "flash" : "lite";
  const temperature = body.resultType
    ? 0.95
    : body.directionId === "counter"
      ? 0.3
      : 0.75;

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
    const subFacets = parseAxesJson(content);
    return NextResponse.json({ subFacets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
