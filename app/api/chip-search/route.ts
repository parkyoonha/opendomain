import { NextResponse } from "next/server";
import { callLLM, pickProvider } from "@/lib/llm";
import { chipSearchSystemPrompt, type ChipSearchMode } from "@/lib/prompts";
import { modelFor } from "@/lib/constants";

export const runtime = "nodejs";

type Body = {
  query?: string;
  perQuery?: number;
  mode?: ChipSearchMode;
};

const isMode = (v: unknown): v is ChipSearchMode =>
  v === "keyword" || v === "attribute" || v === "mechanism";

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

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const perQuery = body.perQuery && body.perQuery > 0 ? body.perQuery : 12;
  const mode = isMode(body.mode) ? body.mode : "keyword";
  const system = chipSearchSystemPrompt(perQuery, mode);
  const user = `검색어: ${query}`;

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, "lite"),
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const parsed = JSON.parse(content) as { chips?: string[] };
    const chips = (parsed.chips ?? []).filter(
      (c): c is string => typeof c === "string" && c.trim().length > 0,
    );
    return NextResponse.json({ chips });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
