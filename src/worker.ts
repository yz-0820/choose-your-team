type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS: AssetFetcher;
  AI_ROAST_API_KEY?: string;
  AI_ROAST_ENDPOINT?: string;
  AI_ROAST_MODEL?: string;
};

type PolymarketOutcome = {
  title: string;
  price: number;
};

type PolymarketMarket = {
  question: string;
  outcomes: PolymarketOutcome[];
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const DEFAULT_AI_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_AI_MODEL = "deepseek-v4-flash";

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai-roast") {
      return handleAiRoast(request, env);
    }

    if (url.pathname === "/api/polymarket") {
      return handlePolymarket(request);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleAiRoast(request: Request, env: Env) {
  if (request.method !== "POST") {
    return json({ comment: "" }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const apiKey = env.AI_ROAST_API_KEY;
    const endpoint = env.AI_ROAST_ENDPOINT || DEFAULT_AI_ENDPOINT;
    const configuredModel = env.AI_ROAST_MODEL || DEFAULT_AI_MODEL;

    if (!prompt || !apiKey) {
      return json({ comment: "" });
    }

    const comment =
      (await requestAiComment(endpoint, apiKey, configuredModel, prompt)) ||
      (configuredModel === DEFAULT_AI_MODEL
        ? ""
        : await requestAiComment(endpoint, apiKey, DEFAULT_AI_MODEL, prompt));

    return json({ comment: normalizeComment(comment) });
  } catch {
    return json({ comment: "" });
  }
}

async function requestAiComment(endpoint: string, apiKey: string, model: string, prompt: string) {
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是中文体育电竞段子手。只输出一句中文友善娱乐锐评，不输出解释、标题或引号，不攻击国家、民族、地区、球员、选手或真人，不提真实投注、赌博、赔率。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 200,
      thinking: { type: "disabled" },
      search: true,
      stream: false,
    }),
  });

  if (!upstream.ok) {
    return "";
  }

  const data = await upstream.json() as {
    comment?: unknown;
    choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
  };
  const message = data.choices?.[0]?.message;
  return normalizeComment(data.comment ?? message?.content ?? message?.reasoning_content);
}

function normalizeComment(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/^[""'"「」]+|[""'"「」]+$/g, "")
    .trim();
}

async function handlePolymarket(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return json([]);
  }

  const data = await fetchPolymarketEvent(slug);
  if (!data) {
    return json([]);
  }

  return json({
    eventTitle: data.title || "",
    markets: parsePolymarketMarkets(data.markets || []),
  });
}

async function fetchPolymarketEvent(slug: string) {
  const bySlug = await fetch(`https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (bySlug.ok) {
    const data = await bySlug.json() as Record<string, unknown>;
    if (data && !Array.isArray(data)) return data;
  }

  const fallback = await fetch(`https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!fallback.ok) return null;

  const data = await fallback.json() as unknown;
  return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : data as Record<string, unknown>;
}

function parsePolymarketMarkets(markets: unknown): PolymarketMarket[] {
  if (!Array.isArray(markets)) return [];

  return markets
    .map((market) => {
      if (!market || typeof market !== "object") return null;
      const item = market as Record<string, unknown>;

      try {
        const outcomes = parseJsonArray(item.outcomes);
        const prices = parseJsonArray(item.outcomePrices);

        return {
          question: typeof item.question === "string" ? item.question : "",
          outcomes: outcomes.map((title, index) => ({
            title: String(title),
            price: Number.parseFloat(String(prices[index] ?? "0")),
          })),
        };
      } catch {
        return null;
      }
    })
    .filter((market): market is PolymarketMarket => Boolean(market));
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}
