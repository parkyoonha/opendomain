import { NextResponse } from "next/server";
import { callLLM, parseAxesJson, pickProvider } from "@/lib/llm";
import { verifyPrompt } from "@/lib/verify";
import { modelFor, type BigCategory } from "@/lib/constants";
import type { SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Body = {
  parentAxis?: string;
  parentPrinciple?: string;
  rootTopic?: string;
  bigCategory?: BigCategory;
  methodId?: string;
  evalId?: string;
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

  const parentAxis = body.parentAxis?.trim();
  const parentPrinciple = body.parentPrinciple?.trim();
  const methodId = body.methodId?.trim() ?? "physics";
  const evalId = body.evalId?.trim() ?? "qualitative";
  if (!parentAxis || !parentPrinciple) {
    return NextResponse.json(
      { error: "parentAxis and parentPrinciple are required" },
      { status: 400 },
    );
  }

  const lensLine = body.lens
    ? `\n렌즈: ${body.lens.discipline}${body.lens.scholar ? ` · ${body.lens.scholar}` : ""}`
    : "";

  const system = `당신은 아이디어의 실현 가능성을 냉정하게 검증하는 검토자다. 낙관·비관 슬로건 금지. 구체 조건·수치·사례로만 답한다.`;
  const user = `${verifyPrompt(parentAxis, parentPrinciple, methodId, evalId, body.rootTopic)}${lensLine}`;

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, "flash"),
      temperature: 0.5,
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
