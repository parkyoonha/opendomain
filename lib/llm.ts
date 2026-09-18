export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Provider = "gemini" | "anthropic";

export type CallLLMParams = {
  provider: Provider;
  apiKey: string;
  model: string;
  messages: Message[];
  temperature?: number;
  jsonMode?: boolean;
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function callLLM(params: CallLLMParams): Promise<string> {
  if (params.provider === "gemini") return callGemini(params);
  if (params.provider === "anthropic") return callAnthropic(params);
  throw new Error(`Unknown provider: ${params.provider}`);
}

async function callGemini(params: CallLLMParams): Promise<string> {
  const { apiKey, model, messages, temperature = 0.7, jsonMode = true } = params;
  const finalMessages = jsonMode ? withJsonInstruction(messages) : messages;
  const body: Record<string, unknown> = {
    model,
    messages: finalMessages,
    temperature,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyGeminiError(res.status, text));
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Gemini returned empty content");
  return jsonMode ? extractJsonBlock(content) : content;
}

function friendlyAnthropicError(status: number, rawText: string): string {
  const upper = rawText.toUpperCase();
  if (status === 401 || upper.includes("INVALID_API_KEY")) {
    return "Anthropic API 키가 유효하지 않아요. 서버 설정의 ANTHROPIC_API_KEY를 확인해주세요.";
  }
  if (status === 429 || upper.includes("RATE_LIMIT")) {
    return "Anthropic 요청이 몰려 한도에 걸렸어요. 잠시 뒤 다시 시도해주세요.";
  }
  if (status === 529 || upper.includes("OVERLOADED")) {
    return "Anthropic 서버가 지금 과부하 상태예요. 몇 초 뒤 다시 눌러보세요.";
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return "Anthropic 서버에 일시적인 문제가 있어요. 잠시 뒤 다시 시도해주세요.";
  }
  if (status === 400) {
    return "Anthropic 요청이 거부됐어요(400). 입력이 너무 길거나 형식이 잘못됐을 수 있어요.";
  }
  return `Anthropic 오류(${status}). 잠시 뒤 다시 시도해주세요.`;
}

function friendlyGeminiError(status: number, rawText: string): string {
  const upper = rawText.toUpperCase();
  const suggestPaid =
    " 급하면 우상단 설정 > 유료(Claude)로 토글하면 바로 사용 가능해요.";

  if (status === 429) {
    const retryMatch = rawText.match(/retry in ([\d.]+)s/i);
    const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    const wait = retrySec ? `${retrySec}초 뒤 다시 시도해주세요.` : "잠시 뒤 다시 시도해주세요.";
    return `Gemini 무료 티어 분당 요청 한도(20콜/분)를 초과했어요. ${wait}${suggestPaid}`;
  }
  if (status === 503 || upper.includes("UNAVAILABLE") || upper.includes("OVERLOADED")) {
    return `Gemini가 지금 사용자가 몰려 응답을 못 주고 있어요. 몇 초 뒤 다시 눌러보세요.${suggestPaid}`;
  }
  if (status === 500 || status === 502 || status === 504) {
    return `Gemini 서버에 일시적인 문제가 있어요. 잠시 뒤 다시 시도해주세요.${suggestPaid}`;
  }
  if (status === 401 || upper.includes("API_KEY_INVALID") || upper.includes("UNAUTHENTICATED")) {
    return "Gemini API 키가 유효하지 않아요. 우상단 설정에서 키를 다시 확인해주세요.";
  }
  if (status === 403 || upper.includes("PERMISSION_DENIED")) {
    return "이 Gemini API 키로 해당 모델을 호출할 권한이 없어요. Google AI Studio에서 키 권한/결제 상태를 확인해주세요.";
  }
  if (status === 404 || upper.includes("NOT_FOUND") || upper.includes("MODEL_NOT_FOUND")) {
    return "요청한 Gemini 모델을 찾을 수 없어요. 잠시 후 다시 시도하거나 유료(Claude)로 전환해주세요.";
  }
  if (upper.includes("SAFETY") || upper.includes("BLOCKED") || upper.includes("PROHIBITED_CONTENT")) {
    return "Gemini 안전 필터에 걸려 응답이 차단됐어요. 주제나 표현을 살짝 바꿔서 다시 시도해주세요.";
  }
  if (upper.includes("RECITATION")) {
    return "Gemini가 저작권 우려로 응답을 중단했어요. 주제를 조금 다르게 표현해 다시 시도해주세요.";
  }
  if (upper.includes("QUOTA")) {
    return `Gemini 일일/월간 쿼터를 초과했어요. Google AI Studio에서 사용량을 확인해주세요.${suggestPaid}`;
  }
  if (status === 400) {
    return `Gemini 요청이 거부됐어요 (400). 입력이 너무 길거나 형식 문제일 수 있어요.${suggestPaid}`;
  }
  return `Gemini 오류(${status}). 잠시 뒤 다시 시도해주세요.${suggestPaid}`;
}

function withJsonInstruction(messages: Message[]): Message[] {
  const instruction =
    "반드시 유효한 JSON 객체만 응답하라. 코드 펜스(```) 없이 원시 JSON.";
  const idx = messages.findIndex((m) => m.role === "system");
  if (idx >= 0) {
    return messages.map((m, i) =>
      i === idx ? { ...m, content: `${m.content}\n\n${instruction}` } : m,
    );
  }
  return [{ role: "system", content: instruction }, ...messages];
}

async function callAnthropic(params: CallLLMParams): Promise<string> {
  const { apiKey, model, messages, temperature = 0.7, jsonMode = true } = params;

  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content);
  const nonSystem = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const system = jsonMode
    ? `${systemParts.join("\n\n")}\n\n반드시 유효한 JSON 객체만 응답하라. 코드 블록·설명 없이 원시 JSON.`
    : systemParts.join("\n\n");

  const body = {
    model,
    max_tokens: 8192,
    temperature,
    system,
    messages: nonSystem,
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyAnthropicError(res.status, text));
  }
  const json = (await res.json()) as {
    content?: { type?: string; text?: string }[];
  };
  const raw = json.content?.find((c) => c.type === "text")?.text;
  if (!raw) throw new Error("Anthropic returned empty content");
  return jsonMode ? extractJsonBlock(raw) : raw;
}

function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

// -----------------------------------------------------------------------------
// Response parsers (provider-agnostic — content is always a JSON string)
// -----------------------------------------------------------------------------

export function parseAxesJson(content: string): Record<string, string> {
  const parsed = JSON.parse(content) as {
    axes?: { name?: string; principle?: string }[];
  };
  const out: Record<string, string> = {};
  for (const a of parsed.axes ?? []) {
    if (a?.name && a?.principle) out[a.name] = a.principle;
  }
  return out;
}

export type ChipRec = { chipText: string; reason: string };
export type ChipRecommendations = Record<string, ChipRec[]>;

export type CombinedIdea = {
  title: string;
  summary: string;
  mechanism: string[];
  usedPrinciples: string[];
};

export function parseCombinedIdeaJson(content: string): CombinedIdea {
  const parsed = JSON.parse(content) as Partial<CombinedIdea>;
  return {
    title: parsed.title ?? "",
    summary: parsed.summary ?? "",
    mechanism: Array.isArray(parsed.mechanism) ? parsed.mechanism : [],
    usedPrinciples: Array.isArray(parsed.usedPrinciples)
      ? parsed.usedPrinciples
      : [],
  };
}

export function parseChipRecommendationsJson(
  content: string,
): ChipRecommendations {
  const parsed = JSON.parse(content) as {
    recommendations?: Record<string, { chipText?: string; reason?: string }[]>;
  };
  const out: ChipRecommendations = {};
  for (const [cat, arr] of Object.entries(parsed.recommendations ?? {})) {
    out[cat] = (arr ?? [])
      .filter((x): x is { chipText: string; reason: string } =>
        Boolean(x?.chipText && x?.reason),
      )
      .map((x) => ({ chipText: x.chipText, reason: x.reason }));
  }
  return out;
}

// -----------------------------------------------------------------------------
// Provider selection helper (used by API routes)
// -----------------------------------------------------------------------------

export type ProviderChoice = {
  provider: Provider;
  apiKey: string;
  tier: "free" | "paid";
};

export function pickProvider(
  userGeminiKey: string | null,
): ProviderChoice | { error: string } {
  if (userGeminiKey && userGeminiKey.trim().length > 0) {
    return { provider: "gemini", apiKey: userGeminiKey.trim(), tier: "free" };
  }
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic && anthropic.length > 0) {
    return { provider: "anthropic", apiKey: anthropic, tier: "paid" };
  }
  return {
    error:
      "설정에서 Gemini API 키를 입력하거나 서버에 ANTHROPIC_API_KEY를 구성하세요.",
  };
}
