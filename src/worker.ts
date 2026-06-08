type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS: AssetFetcher;
  POSTER_COUNTER: DurableObjectNamespace;
  AI_ROAST_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  AI_API_KEY?: string;
  AI_ROAST_ENDPOINT?: string;
  AI_ROAST_MODEL?: string;
};

type DurableObjectNamespace = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
};

type DurableObjectId = unknown;

type DurableObjectStub = {
  fetch(request: Request): Promise<Response>;
};

type DurableObjectState = {
  storage: {
    sql?: {
      exec<T = unknown>(query: string, ...bindings: unknown[]): {
        one(): T;
        toArray(): T[];
      };
    };
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    transaction?<T>(closure: (txn: {
      get<TValue>(key: string): Promise<TValue | undefined>;
      put<TValue>(key: string, value: TValue): Promise<void>;
    }) => Promise<T>): Promise<T>;
  };
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

    if (url.pathname === "/api/ai-roast-health") {
      return handleAiRoastHealth(env);
    }

    if (url.pathname === "/api/polymarket") {
      return handlePolymarket(request);
    }

    if (url.pathname === "/api/poster-serial") {
      return handlePosterSerial(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

export class PosterCounter {
  constructor(private state: DurableObjectState) {
    this.state.storage.sql?.exec(
      "CREATE TABLE IF NOT EXISTS poster_counter (id TEXT PRIMARY KEY, value INTEGER NOT NULL)"
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      if (this.state.storage.sql) {
        const row = this.state.storage.sql
          .exec<{ value: number }>("SELECT value FROM poster_counter WHERE id = ?", "global")
          .toArray()[0];
        return json({ serial: row?.value ?? 0 });
      }

      const current = (await this.state.storage.get<number>("serial")) ?? 0;
      return json({ serial: current });
    }

    if (request.method !== "POST") {
      return json({ serial: null }, { status: 405 });
    }

    if (this.state.storage.sql) {
      const row = this.state.storage.sql
        .exec<{ value: number }>(
          `INSERT INTO poster_counter (id, value)
           VALUES (?, 1)
           ON CONFLICT(id) DO UPDATE SET value = value + 1
           RETURNING value`,
          "global"
        )
        .one();
      return json({ serial: row.value });
    }

    const transaction = this.state.storage.transaction;
    if (transaction) {
      const next = await transaction(async (txn) => {
        const current = (await txn.get<number>("serial")) ?? 0;
        const serial = current + 1;
        await txn.put("serial", serial);
        return serial;
      });
      return json({ serial: next });
    }

    const current = (await this.state.storage.get<number>("serial")) ?? 0;
    const next = current + 1;
    await this.state.storage.put("serial", next);
    return json({ serial: next });
  }
}

function handlePosterSerial(request: Request, env: Env) {
  if (!env.POSTER_COUNTER) {
    return json({ serial: null, error: "missing_counter_binding" }, { status: 503 });
  }

  try {
    const id = env.POSTER_COUNTER.idFromName("global-poster-serial");
    return env.POSTER_COUNTER.get(id).fetch(request);
  } catch {
    return json({ serial: null, error: "counter_unavailable" }, { status: 503 });
  }
}

async function handleAiRoast(request: Request, env: Env) {
  if (request.method !== "POST") {
    return json({ comment: "" }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const apiKey = getAiApiKey(env);
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

async function handleAiRoastHealth(env: Env) {
  const apiKey = getAiApiKey(env);
  const endpoint = env.AI_ROAST_ENDPOINT || DEFAULT_AI_ENDPOINT;
  const configuredModel = env.AI_ROAST_MODEL || DEFAULT_AI_MODEL;

  if (!apiKey) {
    return json({
      ok: false,
      stage: "missing_api_key",
      endpointConfigured: Boolean(env.AI_ROAST_ENDPOINT),
      model: configuredModel,
    });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: configuredModel,
        messages: [
          { role: "system", content: "只输出中文两个字：正常" },
          { role: "user", content: "健康检查" },
        ],
        max_tokens: 20,
        temperature: 0,
        thinking: { type: "disabled" },
        stream: false,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return json({
        ok: false,
        stage: "upstream_error",
        status: upstream.status,
        model: configuredModel,
        bodyPreview: text.slice(0, 240),
      });
    }

    return json({
      ok: true,
      stage: "ok",
      status: upstream.status,
      model: configuredModel,
    });
  } catch (error) {
    return json({
      ok: false,
      stage: "fetch_failed",
      model: configuredModel,
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

function getAiApiKey(env: Env) {
  return env.AI_ROAST_API_KEY || env.DEEPSEEK_API_KEY || env.AI_API_KEY;
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
