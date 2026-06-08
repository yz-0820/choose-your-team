import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const root = process.cwd();
const logoDir = join(root, "public/logos");
mkdirSync(logoDir, { recursive: true });

const pages = [
  {
    url: "https://liquipedia.net/valorant/VCT/2026/Stage_2/Masters",
    teams: {
      "G2 Esports": "g2",
      "EDward Gaming": "edg",
      "Team Heretics": "team-heretics",
      "Paper Rex": "paper-rex",
      "XLG Esports": "xlg",
      "Dragon Ranger Gaming": "drg",
      "Global Esports": "global-esports",
      "FULL SENSE": "full-sense",
      "Team Vitality": "team-vitality",
      "FUT Esports": "fut",
      "Leviatán": "leviatan",
      NRG: "nrg",
    },
  },
  {
    url: "https://liquipedia.net/counterstrike/Intel_Extreme_Masters/2026/Cologne",
    teams: {
      B8: "b8",
      "BetBoom Team": "betboom",
      GamerLegion: "gamerlegion",
      M80: "m80",
      "Lynn Vision Gaming": "lynn-vision",
      MIBR: "mibr",
      NRG: "nrg",
      BIG: "big",
      "Team Liquid": "liquid",
      THUNDERdOWNUNDER: "thunder-downunder",
      TYLOO: "tyloo",
      "Sharks Esports": "sharks",
      FlyQuest: "flyquest",
      HEROIC: "heroic",
      "Gaimin Gladiators": "gaimin-gladiators",
      "SINNERS Esports": "sinners",
      "FUT Esports": "fut",
      "Team Spirit": "spirit",
      Astralis: "astralis",
      "G2 Esports": "g2-cs",
      Legacy: "legacy",
      "paiN Gaming": "pai-nexus",
      Monte: "monte",
      "9z Team": "9z",
      "Team Vitality": "vitality",
      "Natus Vincere": "natus-vincere",
      "Team Falcons": "falcons",
      "The MongolZ": "mongolz",
      PARIVISION: "parivision",
      "Aurora Gaming": "aurora",
      FURIA: "furia",
      MOUZ: "mouz",
    },
  },
];

const normalize = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');

const absoluteLiquipediaUrl = (src) => {
  const clean = normalize(src).trim();
  return clean.startsWith("http") ? clean : `https://liquipedia.net${clean}`;
};

const bestImageUrl = (src, srcset = "") => {
  const candidates = normalize(srcset)
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
  return absoluteLiquipediaUrl(candidates.at(-1) ?? src);
};

const extractTeamImages = (html) => {
  const images = new Map();
  const pattern =
    /<span class="team-template-image[^"]*">[\s\S]*?<a[^>]+title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[^>]*(?:srcset="([^"]+)")?/g;
  let match;
  while ((match = pattern.exec(html))) {
    const title = normalize(match[1]);
    if (!images.has(title)) {
      images.set(title, bestImageUrl(match[2], match[3]));
    }
  }
  return images;
};

const download = async (url, id) => {
  const out = join(logoDir, `${id}.png`);
  mkdirSync(dirname(out), { recursive: true });
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; choose-your-team/1.0; local prototype)",
      Referer: "https://liquipedia.net/",
    },
  });
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${url}`);
  }
  await pipeline(res.body, createWriteStream(out));
};

const missing = [];
for (const page of pages) {
  const html = await fetch(page.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; choose-your-team/1.0; local prototype)" },
  }).then((res) => res.text());
  const images = extractTeamImages(html);

  for (const [title, id] of Object.entries(page.teams)) {
    const image = images.get(title);
    if (!image) {
      missing.push(`${title} (${id})`);
      continue;
    }
    await download(image, id);
    console.log(`${id} <= ${title}`);
  }
}

if (missing.length) {
  throw new Error(`Missing Liquipedia images: ${missing.join(", ")}`);
}
