import http from "http";
import https from "https";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type ChatCompletionResponse = {
  comment?: unknown;
  choices?: Array<{
    message?: {
      content?: unknown;
      reasoning_content?: unknown;
    };
  }>;
};

const readBody = (req: NodeJS.ReadableStream) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const sendJson = (
  res: NodeJS.WritableStream & {
    statusCode?: number;
    setHeader?: (key: string, value: string) => void;
  },
  status: number,
  data: unknown,
) => {
  res.statusCode = status;
  res.setHeader?.("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
};

const normalizeComment = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/^["""'"「」]+|["""'"「」]+$/g, "")
    .trim();
};

/**
 * 通过 HTTP 代理发起请求（用于被墙的网站）
 */
const fetchViaProxy = (
  proxyUrl: string,
  targetUrl: string,
  timeoutMs = 15000
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const proxyParts = proxyUrl.replace("http://", "").split(":");
    const proxyHost = proxyParts[0];
    const proxyPort = parseInt(proxyParts[1], 10);
    const timer = setTimeout(() => reject(new Error("Proxy request timeout")), timeoutMs);

    const req = http.request(
      {
        hostname: proxyHost,
        port: proxyPort,
        method: "GET",
        path: targetUrl,
        headers: {
          Host: new URL(targetUrl).host,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          clearTimeout(timer);
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve([]);
          }
        });
      }
    );
    req.on("error", (e) => {
      clearTimeout(timer);
      resolve([]);
    });
    req.end();
  });
};

const createAiRoastProxy = (env: Record<string, string>): Plugin => ({
  name: "ai-roast-proxy",
  configureServer(server) {
    server.middlewares.use("/api/ai-roast", async (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { comment: "" });
        return;
      }

      try {
        const body = await readBody(req);
        const payload = body ? (JSON.parse(body) as { prompt?: unknown }) : {};
        const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
        const apiKey = env.AI_ROAST_API_KEY;
        const endpoint = env.AI_ROAST_ENDPOINT || "https://api.deepseek.com/chat/completions";
        const model = env.AI_ROAST_MODEL || "deepseek-v4-flash";

        if (!prompt || !apiKey) {
          sendJson(res, 200, { comment: "" });
          return;
        }

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
          sendJson(res, 200, { comment: "" });
          return;
        }

        const data = (await upstream.json()) as ChatCompletionResponse;
        const message = data.choices?.[0]?.message;
        const comment = normalizeComment(data.comment ?? message?.content ?? message?.reasoning_content);
        sendJson(res, 200, { comment });
      } catch {
        sendJson(res, 200, { comment: "" });
      }
    });
  },
});

const createPolymarketProxy = (env: Record<string, string>): Plugin => ({
  name: "polymarket-proxy",
  configureServer(server) {
    server.middlewares.use("/api/polymarket", async (req, res) => {
      if (req.method !== "GET") {
        sendJson(res, 405, []);
        return;
      }

      const proxy = env.POLYMARKET_PROXY;
      if (!proxy) {
        sendJson(res, 500, { error: "POLYMARKET_PROXY not configured" });
        return;
      }

      const url = new URL(req.url!, `http://${req.headers.host}`);
      const slug = url.searchParams.get("slug");

      if (!slug) {
        sendJson(res, 400, []);
        return;
      }

      try {
        const targetUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
        const data = (await fetchViaProxy(proxy, targetUrl)) as any[];

        if (!Array.isArray(data) || data.length === 0) {
          sendJson(res, 200, []);
          return;
        }

        // 解析 outcomes 并返回简化格式
        const event = data[0];
        const allMarkets = event?.markets || [];
        const parsedMarkets = allMarkets.map((m: any) => {
          try {
            const outcomes: string[] = typeof m.outcomes === "string" ? JSON.parse(m.outcomes) : m.outcomes || [];
            const prices: string[] = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices || [];
            return {
              question: m.question || "",
              outcomes: outcomes.map((title: string, i: number) => ({
                title,
                price: parseFloat(prices[i] || "0"),
              })),
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        sendJson(res, 200, {
          eventTitle: event.title,
          markets: parsedMarkets,
        });
      } catch (e) {
        console.error(`Polymarket proxy error for ${slug}:`, e);
        sendJson(res, 200, []);
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), createAiRoastProxy(env), createPolymarketProxy(env)],
  };
});
