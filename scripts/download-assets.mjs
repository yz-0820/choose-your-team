import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const root = process.cwd();
const logoDir = join(root, "public/logos");
const bgDir = join(root, "public/backgrounds");

mkdirSync(logoDir, { recursive: true });
mkdirSync(bgDir, { recursive: true });

const asset = (path, url) => ({ path, url });
const siteIcon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const flag = (code) => `https://flagcdn.com/w160/${code}.png`;

const assets = [
  asset("logos/sas.png", "https://a.espncdn.com/i/teamlogos/nba/500/sa.png"),
  asset("logos/nyk.png", "https://a.espncdn.com/i/teamlogos/nba/500/ny.png"),

  asset("logos/xlg.png", siteIcon("xlgaming.com")),
  asset("logos/edg.png", siteIcon("edwardgaming.com")),
  asset("logos/drg.png", siteIcon("dragongaming.com")),
  asset("logos/global-esports.png", siteIcon("global-esports.com")),
  asset("logos/full-sense.png", siteIcon("fullsense.gg")),
  asset("logos/paper-rex.png", siteIcon("paperrex.team")),
  asset("logos/team-vitality.png", siteIcon("teamvitality.com")),
  asset("logos/fut.png", siteIcon("futesports.gg")),
  asset("logos/team-heretics.png", siteIcon("teamheretics.com")),
  asset("logos/leviatan.png", siteIcon("leviatan.gg")),
  asset("logos/g2.png", siteIcon("g2esports.com")),
  asset("logos/nrg.png", siteIcon("nrg.gg")),

  asset("logos/falcons.png", siteIcon("teamfalcons.gg")),
  asset("logos/vitality.png", siteIcon("teamvitality.com")),
  asset("logos/faze.png", siteIcon("fazeclan.com")),
  asset("logos/mongolz.png", siteIcon("themongolz.com")),
  asset("logos/mouz.png", siteIcon("mouz.gg")),
  asset("logos/natus-vincere.png", siteIcon("navi.gg")),
  asset("logos/spirit.png", siteIcon("teamspirit.gg")),
  asset("logos/aurora.png", siteIcon("auroragaming.com")),
  asset("logos/g2-cs.png", siteIcon("g2esports.com")),
  asset("logos/liquid.png", siteIcon("teamliquid.com")),
  asset("logos/furia.png", siteIcon("furia.gg")),
  asset("logos/virtus-pro.png", siteIcon("virtus.pro")),
  asset("logos/complexity.png", siteIcon("complexity.gg")),
  asset("logos/nip.png", siteIcon("nip.gl")),
  asset("logos/astralis.png", siteIcon("astralis.gg")),
  asset("logos/3dmax.png", siteIcon("3dmax.fr")),
  asset("logos/pai-nexus.png", siteIcon("pain.gg")),
  asset("logos/tyloo.png", siteIcon("tyloo.com")),
  asset("logos/mibr.png", siteIcon("mibr.gg")),
  asset("logos/heroic.png", siteIcon("heroic.gg")),
  asset("logos/big.png", siteIcon("bigclan.gg")),
  asset("logos/fnatic.png", siteIcon("fnatic.com")),
  asset("logos/betboom.png", siteIcon("betboom.team")),
  asset("logos/imperial.png", siteIcon("imperial.gg")),
  asset("logos/b8.png", siteIcon("b8esports.gg")),
  asset("logos/saw.png", siteIcon("sawggofficial.pt")),
  asset("logos/metizport.png", siteIcon("metizport.com")),
  asset("logos/m80.png", siteIcon("m80.gg")),
  asset("logos/lynn-vision.png", siteIcon("lynnvision.cn")),
  asset("logos/flyquest.png", siteIcon("flyquest.gg")),
  asset("logos/red-canids.png", siteIcon("redcanids.com.br")),
  asset("logos/legacy.png", siteIcon("legacyesports.com.br")),

  asset("backgrounds/nba-finals.jpg", "https://cdn.nba.com/manage/2026/01/Full-Series-Schedule-Finals-26-NYK-SAS-16x9-SquareSafezone-1-784x441.jpg"),
  asset("backgrounds/nba-finals-live.jpg", "https://cdn.nba.com/manage/2026/06/wemby-towns-060326-scaled.jpg?w=1470&h=826"),
  asset("backgrounds/valorant-masters.jpg", "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/747b64c1266990dd2be88ccecfafccb23a40e49f-1920x1080.jpg?accountingTag=val_esports&auto=format&fit=max&w=1920"),
  asset("backgrounds/cs-cologne-major.png", "https://content.presspage.com/uploads/2959/fa7d1a66-da91-4595-b9b0-f1a8995581a5/1920_artboard1.png?10000"),
  asset("backgrounds/cs-cologne-major-hero.png", "https://content.presspage.com/uploads/2959/fa7d1a66-da91-4595-b9b0-f1a8995581a5/1920_artboard1.png?10000"),
  asset("backgrounds/world-cup.jpg", "https://store.fifa.com/cdn/shop/files/image_217bb8c0-803c-4772-9c18-18f1e677f831.jpg?v=1780325535"),
];

const flagCodes = {
  canada: "ca",
  mexico: "mx",
  usa: "us",
  australia: "au",
  iraq: "iq",
  iran: "ir",
  japan: "jp",
  jordan: "jo",
  "south-korea": "kr",
  qatar: "qa",
  "saudi-arabia": "sa",
  uzbekistan: "uz",
  algeria: "dz",
  "cape-verde": "cv",
  "dr-congo": "cd",
  "ivory-coast": "ci",
  egypt: "eg",
  ghana: "gh",
  morocco: "ma",
  senegal: "sn",
  "south-africa": "za",
  tunisia: "tn",
  curacao: "cw",
  haiti: "ht",
  panama: "pa",
  argentina: "ar",
  brazil: "br",
  colombia: "co",
  ecuador: "ec",
  paraguay: "py",
  uruguay: "uy",
  "new-zealand": "nz",
  austria: "at",
  belgium: "be",
  bosnia: "ba",
  croatia: "hr",
  czechia: "cz",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  netherlands: "nl",
  norway: "no",
  portugal: "pt",
  scotland: "gb-sct",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  turkiye: "tr",
};

for (const [id, code] of Object.entries(flagCodes)) {
  assets.push(asset(`logos/${id}.png`, flag(code)));
}

const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#111318"/><path d="M31 23h66l8 20v29c0 22-14 38-41 48-27-10-41-26-41-48V43l8-20Z" fill="#d6a13d"/><path d="M48 52h32v11H48zm0 22h32v11H48z" fill="#111318"/></svg>`;
writeFileSync(join(logoDir, "placeholder.svg"), placeholder);

const download = async ({ path, url }) => {
  const out = join(root, "public", path);
  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out)) {
    return `${path} (kept)`;
  }
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; choose-your-team/1.0)",
    },
  });
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${url}`);
  }
  await pipeline(res.body, createWriteStream(out));
  return path;
};

const failed = [];
const pending = [...assets];
const worker = async () => {
  while (pending.length) {
    const item = pending.shift();
    if (!item) return;
    try {
      const path = await download(item);
      console.log(`downloaded ${path}`);
    } catch (error) {
      failed.push({ path: item.path, url: item.url, error: error.message });
      console.warn(`failed ${item.path}: ${error.message}`);
    }
  }
};

await Promise.all(Array.from({ length: 8 }, worker));

if (failed.length) {
  console.warn(`Completed with ${failed.length} failed assets.`);
} else {
  console.log(`Downloaded ${assets.length} assets.`);
}
