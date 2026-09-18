import { NextResponse } from "next/server";
import { callLLM, parseCombinedIdeaJson, pickProvider } from "@/lib/llm";
import { combineSystemPrompt } from "@/lib/prompts";
import { chipKindLabel, modelFor, type ChipKind } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Facet = { axis: string; principle: string };

type Body = {
  topicText?: string;
  topicFacets?: Facet[];
  chipKind?: ChipKind | null;
  chipText?: string | null;
  chipFacets?: Facet[];
  chipCategory?: string | null;
  chipReason?: string | null;
  lens?: SelectedLens | null;
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
  const topicFacets = body.topicFacets ?? [];
  const chipFacets = body.chipFacets ?? [];
  if (!topicText) {
    return NextResponse.json({ error: "topicText required" }, { status: 400 });
  }
  if (topicFacets.length === 0 && chipFacets.length === 0 && !body.chipText) {
    return NextResponse.json(
      { error: "at least one topic facet or chip is required" },
      { status: 400 },
    );
  }

  const lines: string[] = [];
  lines.push(`## 주제\n- ${topicText}`);
  if (topicFacets.length > 0) {
    lines.push(`\n## 주제 분해 축 (선택된 원리)`);
    for (const f of topicFacets) {
      lines.push(`- **${f.axis}**: ${f.principle}`);
    }
    lines.push(`위 원리를 후보 안에 구체적으로 작동시켜라.`);
  }
  if (body.chipText) {
    const kindLabel = body.chipKind
      ? chipKindLabel[body.chipKind]
      : body.chipCategory ?? "";
    lines.push(`\n## 칩 — ${kindLabel} · ${body.chipText}`);
    if (body.chipReason) lines.push(`- 이유: ${body.chipReason}`);
    if (chipFacets.length > 0) {
      lines.push(`\n### 칩 분해 축 (선택된 원리)`);
      for (const f of chipFacets) {
        lines.push(`- **${f.axis}**: ${f.principle}`);
      }
      lines.push(`위 축 원리를 후보 안에 작동 메커니즘으로 이식하라.`);
    } else {
      lines.push(`이 칩의 핵심 메커니즘을 후보 안에 이식하라.`);
    }
  }

  if (body.lens) {
    const scholar = body.lens.scholar ? ` · ${body.lens.scholar}` : "";
    lines.push(`\n## 적용 렌즈\n- ${body.lens.discipline}${scholar}`);
  }

  const system = combineSystemPrompt(body.lens);
  const user = lines.join("\n");

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, "flash"),
      temperature: 1.0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const idea = parseCombinedIdeaJson(content);
    return NextResponse.json({ idea });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
