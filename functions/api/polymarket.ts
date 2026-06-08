// EdgeOne Pages Function: /api/polymarket
// Fetches real-time odds from Polymarket Gamma API
// EdgeOne is hosted overseas, so direct access works fine

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const targetUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = data[0];
    const allMarkets = event?.markets || [];
    const parsedMarkets = allMarkets.map((m) => {
      try {
        const outcomes = typeof m.outcomes === "string" ? JSON.parse(m.outcomes) : m.outcomes || [];
        const prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices || [];
        return {
          question: m.question || "",
          outcomes: outcomes.map((title, i) => ({
            title,
            price: parseFloat(prices[i] || "0"),
          })),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return new Response(JSON.stringify({
      eventTitle: event.title,
      markets: parsedMarkets,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
