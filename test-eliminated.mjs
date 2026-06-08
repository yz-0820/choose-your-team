import http from 'http';

const VITE_PORT = 5173;

function fetchViaViteProxy(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: VITE_PORT,
      method: 'GET',
      path: path,
      headers: { 'Host': 'localhost' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data.substring(0, 500) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function extractTeamFromQuestion(q) {
  const m = q.match(/Will(?: the)?\s+(.+?)\s+win/i);
  return m ? m[1].replace(/\?$/, "").trim() : null;
}

async function test() {
  const slugs = [
    { id: 'cs2', slug: 'iem-cologne-major-2026-winner' },
    { id: 'vct', slug: 'valorant-masters-london-2026-winner' },
    { id: 'wc', slug: 'world-cup-winner' },
    { id: 'nba', slug: '2026-nba-champion' }
  ];

  for (const { id, slug } of slugs) {
    console.log(`\n=== ${id}: ${slug} ===`);
    const data = await fetchViaViteProxy(`/api/polymarket?slug=${slug}`);
    if (!data || Array.isArray(data) || !data.markets?.length) {
      console.log('No data');
      continue;
    }

    // Show teams with 0% odds and near-zero
    const allTeams = [];
    for (const market of data.markets) {
      const team = extractTeamFromQuestion(market.question);
      const yes = market.outcomes.find(o => o.title.toLowerCase() === 'yes');
      if (team && yes) {
        allTeams.push({ team, price: yes.price, pct: (yes.price * 100).toFixed(4) + '%' });
      }
    }

    allTeams.sort((a, b) => a.price - b.price);

    const zeros = allTeams.filter(t => t.price === 0);
    const veryLow = allTeams.filter(t => t.price > 0 && t.price < 0.001);
    const low = allTeams.filter(t => t.price >= 0.001 && t.price < 0.01);

    if (zeros.length > 0) {
      console.log(`  ZERO (${zeros.length}): ${zeros.map(t => `${t.team}: ${t.pct}`).join(', ')}`);
    }
    if (veryLow.length > 0) {
      console.log(`  VERY LOW (${veryLow.length}): ${veryLow.map(t => `${t.team}: ${t.pct}`).join(', ')}`);
    }
    if (low.length > 0) {
      console.log(`  LOW (${low.length}): ${low.map(t => `${t.team}: ${t.pct}`).join(', ')}`);
    }
    console.log(`  Total teams: ${allTeams.length}, With odds: ${allTeams.length - zeros.length}`);
  }
}

test();
