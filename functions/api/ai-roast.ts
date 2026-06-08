// EdgeOne Pages Function: /api/ai-roast
// Handles AI roast generation via DeepSeek API

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ comment: "" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await context.request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const apiKey = context.env.AI_ROAST_API_KEY;
    const endpoint = context.env.AI_ROAST_ENDPOINT || "https://api.deepseek.com/chat/completions";
    const model = context.env.AI_ROAST_MODEL || "deepseek-v4-flash";

    if (!prompt || !apiKey) {
      return new Response(JSON.stringify({ comment: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ comment: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const message = data.choices?.[0]?.message;
    const comment = normalizeComment(data.comment ?? message?.content ?? message?.reasoning_content);
    return new Response(JSON.stringify({ comment }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ comment: "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function normalizeComment(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/^[""'"「」]+|[""'"「」]+$/g, "")
    .trim();
}
