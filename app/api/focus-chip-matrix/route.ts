import { NextResponse } from "next/server";
import { callLLM, pickProvider } from "@/lib/llm";
import {
  chipFocusMatrixSystemPrompt,
  type FocusMatrixReq,
} from "@/lib/prompts";
import { kSimilarCategories, modelFor } from "@/lib/constants";
import type {
  FocusChipCandidate,
  FocusMatchCell,
  FocusMatchVerdict,
} from "@/lib/verify";

export const runtime = "nodejs";

type Body = {
  topicText?: string;
  axis?: string;
  principle?: string;
  categories?: string[];
  perCategory?: number;
  targetOutput?: string;
  excludeNeed?: string;
  // Full requirement set from the active verify report. Each candidate
  // chip is scored against every one of these.
  requirements?: FocusMatrixReq[];
};

const asString = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

function parseMatrix(content: string, validIds: Set<string>): FocusChipCandidate[] {
  const parsed = JSON.parse(content) as {
    chips?: Array<{
      chipText?: string;
      category?: string;
      reason?: string;
      matches?: Array<{
        requirementId?: string;
        verdict?: string;
        note?: string;
      }>;
    }>;
  };
  const verdictAllowed = new Set<FocusMatchVerdict>(["pass", "partial", "fail"]);
  return (parsed.chips ?? [])
    .map((c) => {
      const matches: FocusMatchCell[] = (c?.matches ?? [])
        .map((m) => ({
          requirementId: asString(m?.requirementId),
          verdict: verdictAllowed.has(m?.verdict as FocusMatchVerdict)
            ? (m?.verdict as FocusMatchVerdict)
            : "partial",
          note: asString(m?.note),
        }))
        .filter((m) => m.requirementId && validIds.has(m.requirementId));
      return {
        chipText: asString(c?.chipText),
        category: asString(c?.category),
        reason: asString(c?.reason),
        matches,
      };
    })
    .filter((c) => c.chipText && c.matches.length > 0);
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

  const topicText = body.topicText?.trim();
  const axis = body.axis?.trim();
  const principle = body.principle?.trim();
  const targetOutput = body.targetOutput?.trim();
  const requirements = (body.requirements ?? [])
    .map((r) => ({
      id: asString(r?.id),
      name: asString(r?.name),
      needs: Array.isArray(r?.needs)
        ? r.needs.filter((x): x is string => typeof x === "string")
        : [],
      provides: Array.isArray(r?.provides)
        ? r.provides.filter((x): x is string => typeof x === "string")
        : [],
    }))
    .filter((r) => r.id && r.name);

  if (!topicText || !axis || !principle || !targetOutput) {
    return NextResponse.json(
      {
        error:
          "topicText, axis, principle, targetOutput are required",
      },
      { status: 400 },
    );
  }
  if (requirements.length === 0) {
    return NextResponse.json(
      { error: "requirements array must not be empty" },
      { status: 400 },
    );
  }

  const perCategory =
    body.perCategory && body.perCategory > 0 ? body.perCategory : 1;
  const categories =
    body.categories && body.categories.length > 0
      ? body.categories
      : [...kSimilarCategories];
  const excludeNeed = body.excludeNeed?.trim() || undefined;

  const system = chipFocusMatrixSystemPrompt(
    categories,
    perCategory,
    targetOutput,
    excludeNeed,
    requirements,
  );
  const user = `찾고 있는 산출(output): ${targetOutput}${excludeNeed ? `\n배제 필요(need): ${excludeNeed}` : ""}\n맥락 주제: ${topicText}\n맥락 축: ${axis}\n맥락 원리: ${principle}`;

  try {
    const content = await callLLM({
      provider: choice.provider,
      apiKey: choice.apiKey,
      model: modelFor(choice.provider, "flash"),
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const validIds = new Set(requirements.map((r) => r.id));
    const chips = parseMatrix(content, validIds);
    return NextResponse.json({ chips, requirements });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
