import { NextResponse } from "next/server";
import { callLLM, pickProvider } from "@/lib/llm";
import {
  verifySystemPrompt,
  verifyUserPrompt,
  type VerifyReport,
  type Feasibility,
  type RequirementPart,
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

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean)
    : [];

function parseVerifyReport(content: string): VerifyReport {
  const parsed = JSON.parse(content) as {
    target?: string;
    requirements?: Array<{
      id?: string;
      name?: string;
      description?: string;
      inputs?: unknown;
      outputs?: unknown;
      feasibility?: string;
      rationale?: string;
      substituteDirections?: unknown;
    }>;
    edges?: Array<{ fromId?: string; toId?: string; token?: string }>;
    danglingInputs?: Array<{ requirementId?: string; token?: string }>;
  };

  const allowed = new Set<Feasibility>(["feasible", "infeasible", "unknown"]);

  const requirements: RequirementPart[] = (parsed.requirements ?? [])
    .map((r, idx) => {
      const feasibility: Feasibility = allowed.has(r?.feasibility as Feasibility)
        ? (r?.feasibility as Feasibility)
        : "unknown";
      const subs = asStringArray(r?.substituteDirections);
      return {
        id: (r?.id ?? String.fromCharCode(65 + idx)).trim() || String.fromCharCode(65 + idx),
        name: (r?.name ?? "").trim(),
        description: (r?.description ?? "").trim(),
        inputs: asStringArray(r?.inputs),
        outputs: asStringArray(r?.outputs),
        feasibility,
        rationale: (r?.rationale ?? "").trim(),
        substituteDirections: feasibility === "infeasible" && subs.length ? subs : undefined,
      };
    })
    .filter((r) => r.name && r.description);

  const validIds = new Set(requirements.map((r) => r.id));

  const edges = (parsed.edges ?? [])
    .map((e) => ({
      fromId: (e?.fromId ?? "").trim(),
      toId: (e?.toId ?? "").trim(),
      token: (e?.token ?? "").trim(),
    }))
    .filter((e) => e.fromId && e.toId && e.token)
    .filter((e) => validIds.has(e.fromId) && validIds.has(e.toId));

  const danglingInputs = (parsed.danglingInputs ?? [])
    .map((d) => ({
      requirementId: (d?.requirementId ?? "").trim(),
      token: (d?.token ?? "").trim(),
    }))
    .filter((d) => d.requirementId && d.token)
    .filter((d) => validIds.has(d.requirementId));

  return {
    target: (parsed.target ?? "").trim(),
    requirements,
    edges,
    danglingInputs,
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
