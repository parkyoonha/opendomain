import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { topicDecompositionSystemPrompt } from "@/lib/prompts";
import { modelFor, type BigCategory } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Body = {
  topicText?: string;
  bigCategory?: BigCategory;
  lens?: SelectedLens | null;
  purposeId?: string;
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

  const system = topicDecompositionSystemPrompt(
    body.bigCategory,
    body.lens,
    body.purposeId,
  );
  const lensLine = body.lens
    ? `\n렌즈: ${body.lens.discipline}${body.lens.scholar ? ` · ${body.lens.scholar}` : ""}`
    : "";
  const purposeLine = body.purposeId ? `\n사고 목적: ${body.purposeId}` : "";
  const user = `주제: ${topic}${purposeLine}${lensLine}`;

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
