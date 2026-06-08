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
    const event = await fetchPolymarketEvent(slug);
    if (!event) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

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

async function fetchPolymarketEvent(slug) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
  };

  const bySlug = await fetch(`https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}`, {
    headers,
  });

  if (bySlug.ok) {
    const data = await bySlug.json();
    if (data && !Array.isArray(data)) return data;
  }

  const fallback = await fetch(`https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`, {
    headers,
  });

  if (!fallback.ok) return null;

  const data = await fallback.json();
  return Array.isArray(data) ? data[0] : data;
}
