import { NextResponse } from "next/server";
import { callLLM, parseChipRecommendationsJson, pickProvider } from "@/lib/llm";
import { chipRecommendationSystemPrompt } from "@/lib/prompts";
import { kSimilarCategories, modelFor } from "@/lib/constants";

export const runtime = "nodejs";

type Body = {
  topicText?: string;
  axis?: string;
  principle?: string;
  categories?: string[];
  perCategory?: number;
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

  const topicText = body.topicText?.trim();
  const axis = body.axis?.trim();
  const principle = body.principle?.trim();
  if (!topicText || !axis || !principle) {
    return NextResponse.json(
      { error: "topicText, axis, principle are required" },
      { status: 400 },
    );
  }

  const perCategory =
    body.perCategory && body.perCategory > 0 ? body.perCategory : 2;
  const categories =
    body.categories && body.categories.length > 0
      ? body.categories
      : [...kSimilarCategories];
  const system = chipRecommendationSystemPrompt(categories, perCategory);
  const user = `주제: ${topicText}\n축: ${axis}\n원리: ${principle}`;

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, "flash"),
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const recommendations = parseChipRecommendationsJson(content);
    return NextResponse.json({ recommendations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
