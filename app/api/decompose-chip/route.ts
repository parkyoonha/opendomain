import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { chipDecompositionSystemPrompt } from "@/lib/prompts";
import {
  chipKindLabel,
  modelFor,
  type BigCategory,
  type ChipKind,
} from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Body = {
  chipText?: string;
  kind?: ChipKind;
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

  const chipText = body.chipText?.trim();
  const kind = body.kind;
  if (!chipText || !kind) {
    return NextResponse.json(
      { error: "chipText and kind are required" },
      { status: 400 },
    );
  }

  const kindLabel = chipKindLabel[kind];
  const system = chipDecompositionSystemPrompt(
    kindLabel,
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
  const user = `칩: ${chipText}\n종류: ${kindLabel}${directionLine}${lensLine}${resultLine}\n\n위 칩을 실제 내용과 렌즈에 맞춰 3~5개 축으로 자유 분해하라. 축 이름은 이 칩 고유의 각도가 드러나도록.`;

  const tier = body.resultType ? "flash" : "lite";

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, tier),
      temperature: body.resultType ? 0.95 : 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const axisToPrinciple = parseAxesJson(content);
    return NextResponse.json({ axisToPrinciple });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
