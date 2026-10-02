import { NextResponse } from "next/server";
import { callLLM, pickProvider } from "@/lib/llm";
import {
  verifySystemPrompt,
  verifyUserPrompt,
  type VerifyReport,
  type VerifyStatus,
} from "@/lib/verify";
import { modelFor, type BigCategory } from "@/lib/constants";
import { lensPromptFragment, type SelectedLens } from "@/lib/lenses";

export const runtime = "nodejs";

type Body = {
  parentAxis?: string;
  parentPrinciple?: string;
  rootTopic?: string;
  bigCategory?: BigCategory;
  lens?: SelectedLens | null;
  userContext?: string;
};

function parseVerifyReport(content: string): VerifyReport {
  const parsed = JSON.parse(content) as {
    target?: string;
    conditions?: {
      name?: string;
      principle?: string;
      status?: string;
      cascade?: {
        issue?: string;
        cause?: string;
        solutionVariables?: unknown;
      };
    }[];
  };
  const allowed = new Set<VerifyStatus>(["pass", "fail", "unknown"]);
  const conditions = (parsed.conditions ?? [])
    .map((c) => {
      const status: VerifyStatus = allowed.has(c?.status as VerifyStatus)
        ? (c?.status as VerifyStatus)
        : "unknown";
      const rawVars = c?.cascade?.solutionVariables;
      const solutionVariables = Array.isArray(rawVars)
        ? rawVars
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
      const cascade =
        status === "fail" &&
        (c?.cascade?.issue || c?.cascade?.cause || solutionVariables.length)
          ? {
              issue: (c?.cascade?.issue ?? "").trim(),
              cause: (c?.cascade?.cause ?? "").trim(),
              solutionVariables,
            }
          : undefined;
      return {
        name: (c?.name ?? "").trim(),
        principle: (c?.principle ?? "").trim(),
        status,
        cascade,
      };
    })
    .filter((c) => c.name && c.principle);
  return {
    target: (parsed.target ?? "").trim(),
    conditions,
  };
}

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
  if (!parentAxis || !parentPrinciple) {
    return NextResponse.json(
      { error: "parentAxis and parentPrinciple are required" },
      { status: 400 },
    );
  }

  const lensFrag = lensPromptFragment(body.lens ?? null);
  const system = `${verifySystemPrompt()}${lensFrag ? `\n\n${lensFrag}` : ""}`;
  const user = verifyUserPrompt(
    parentAxis,
    parentPrinciple,
    body.rootTopic,
    body.userContext,
  );

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
    const report = parseVerifyReport(content);
    return NextResponse.json({ report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
