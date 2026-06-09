import type { Event, Team } from "../data/events";
import { findTeam } from "./predictions";

// Event ID 到 Polymarket slug 的映射
const POLYMARKET_SLUGS: Record<string, string> = {
  "nba-finals": "2026-nba-champion",
  "cs-cologne-major": "iem-cologne-major-2026-winner",
  "valorant-masters": "valorant-masters-london-2026-winner",
  "world-cup": "world-cup-winner",
};

// 队伍名称到 Polymarket outcome 的映射
const TEAM_TO_OUTCOME: Record<string, string> = {
  // NBA
  "圣安东尼奥马刺": "San Antonio Spurs",
  "马刺": "San Antonio Spurs",
  "纽约尼克斯": "New York Knicks",
  "尼克斯": "New York Knicks",

  // CS2
  "Vitality": "Team Vitality",
  "Spirit": "Team Spirit",
  "Falcons": "Falcons",
  "G2 Esports": "G2 Esports",
  "NAVI": "Natus Vincere",
  "MOUZ": "MOUZ",
  "The MongolZ": "The MongolZ",
  "Astralis": "Astralis",
  "FURIA": "FURIA",
  "MIBR": "MIBR",
  "Aurora Gaming": "Aurora Gaming",
  "PARIVISION": "PARIVISION",
  "GamerLegion": "GamerLegion",
  "Legacy": "Legacy",
  "paiN Gaming": "paiN Gaming",
  "Monte": "Monte",
  "9z Team": "9z",
  "BetBoom Team": "BetBoom",
  "FUT Esports": "FUT Esports",
  "BIG": "BIG",
  "M80": "M80",
  "FlyQuest": "FlyQuest",
  "B8": "B8",
  "TYLOO": "TYLOO",

  // VCT
  "EDG": "EDward Gaming",
  "EDward Gaming": "EDward Gaming",
  "G2": "G2 Esports",
  "Team Heretics": "Team Heretics",
  "Heretics": "Team Heretics",
  "TH": "Team Heretics",
  "Paper Rex": "Paper Rex",
  "PRX": "Paper Rex",
  "XLG Esports": "XLG Esports",
  "XLG": "XLG Esports",
  "Dragon Ranger": "Dragon Ranger Gaming",
  "DRG": "Dragon Ranger Gaming",
  "Dragon Ranger Gaming": "Dragon Ranger Gaming",
  "Global Esports": "Global Esports",
  "GE": "Global Esports",
  "FULL SENSE": "FULL SENSE",
  "FS": "FULL SENSE",
  "VIT": "Team Vitality",
  "FUT": "FUT Esports",
  "Leviatán": "Leviatán",
  "LEV": "Leviatán",
  "NRG": "NRG",

  // FIFA World Cup
  "阿根廷": "Argentina",
  "巴西": "Brazil",
  "法国": "France",
  "英格兰": "England",
  "西班牙": "Spain",
  "德国": "Germany",
  "葡萄牙": "Portugal",
  "荷兰": "Netherlands",
  "意大利": "Italy",
  "比利时": "Belgium",
  "克罗地亚": "Croatia",
  "墨西哥": "Mexico",
  "美国": "United States",
  "日本": "Japan",
  "韩国": "South Korea",
  "加拿大": "Canada",
  "乌拉圭": "Uruguay",
  "哥伦比亚": "Colombia",
  "摩洛哥": "Morocco",
  "塞内加尔": "Senegal",
  "澳大利亚": "Australia",
  "伊拉克": "Iraq",
  "伊朗": "Iran",
  "约旦": "Jordan",
  "卡塔尔": "Qatar",
  "沙特阿拉伯": "Saudi Arabia",
  "乌兹别克斯坦": "Uzbekistan",
  "阿尔及利亚": "Algeria",
  "佛得角": "Cape Verde",
  "刚果民主共和国": "Congo DR",
  "科特迪瓦": "Ivory Coast",
  "埃及": "Egypt",
  "加纳": "Ghana",
  "南非": "South Africa",
  "突尼斯": "Tunisia",
  "库拉索": "Curaçao",
  "海地": "Haiti",
  "巴拿马": "Panama",
  "厄瓜多尔": "Ecuador",
  "巴拉圭": "Paraguay",
  "新西兰": "New Zealand",
  "奥地利": "Austria",
  "波黑": "Bosnia-Herzegovina",
  "捷克": "Czechia",
  "挪威": "Norway",
  "苏格兰": "Scotland",
  "瑞典": "Sweden",
  "瑞士": "Switzerland",
  "土耳其": "Turkiye",
  "秘鲁": "Peru",
  "智利": "Chile",
  "玻利维亚": "Bolivia",
  "委内瑞拉": "Venezuela",
};

type PolymarketOutcome = {
  title: string;
  price: number;
};

type PolymarketMarket = {
  question: string;
  outcomes: PolymarketOutcome[];
};

type PolymarketProxyResponse = {
  eventTitle: string;
  markets: PolymarketMarket[];
} | [];

/** 缓存过期时间：60 分钟 */
const CACHE_TTL = 60 * 60 * 1000;

const getCacheKey = (slug: string) => `poly:v3:${slug}`;

interface CacheEntry {
  data: PolymarketProxyResponse;
  timestamp: number;
}

const readCache = (slug: string): PolymarketProxyResponse | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(slug));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < CACHE_TTL && isPolymarketProxyResponse(entry.data)) {
      // 空数组不认为是有效缓存
      if (Array.isArray(entry.data) && entry.data.length === 0) {
        localStorage.removeItem(getCacheKey(slug));
        return null;
      }
      return entry.data;
    }
    localStorage.removeItem(getCacheKey(slug));
  } catch {
    // ignore parse errors
  }
  return null;
};

const writeCache = (slug: string, data: PolymarketProxyResponse) => {
  if (!isPolymarketProxyResponse(data)) return;
  // 空数组不缓存
  if (Array.isArray(data) && data.length === 0) return;
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(slug), JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
};

const isPolymarketProxyResponse = (data: unknown): data is PolymarketProxyResponse => {
  if (Array.isArray(data)) return true;
  return Boolean(
    data &&
      typeof data === "object" &&
      Array.isArray((data as { markets?: unknown }).markets)
  );
};

/**
 * 通过 Vite 开发服务器代理获取 Polymarket 数据
 * （Vite 服务端通过配置的 HTTP 代理访问，绕过网络封锁）
 * 支持 localStorage 60 分钟缓存
 */
const fetchPolymarketViaViteProxy = async (slug: string): Promise<PolymarketProxyResponse> => {
  // 优先读缓存
  const cached = readCache(slug);
  if (cached !== null) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `/api/polymarket?slug=${encodeURIComponent(slug)}`,
      { signal: controller.signal }
    );

    window.clearTimeout(timeout);
    if (!response.ok) return [];
    const data = await response.json();
    // 写入缓存
    writeCache(slug, data);
    return data;
  } catch {
    return [];
  }
};

export const getPolymarketSlug = (eventId: string): string | null => {
  return POLYMARKET_SLUGS[eventId] ?? null;
};

const normalizeTeamName = (teamName: string): string => {
  return TEAM_TO_OUTCOME[teamName] || teamName;
};

const normalizeText = (value: string): string =>
  normalizeTeamName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getTeamMatchNames = (team: Pick<Team, "id" | "nameZh" | "nameEn" | "abbr">): string[] => {
  const names = [team.nameZh, team.nameEn, team.abbr, team.id]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText)
    .filter(Boolean);

  return Array.from(new Set(names));
};

const hasTeamMatch = (value: string, teamNames: string[]): boolean => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return false;

  return teamNames.some((teamName) => {
    if (!teamName) return false;
    return normalizedValue === teamName ||
      normalizedValue.includes(teamName) ||
      teamName.includes(normalizedValue);
  });
};

/**
 * 从问题中提取队伍名称（用于 "Will XXX win..." 类型的二元市场）
 */
const extractTeamFromQuestion = (question: string): string | null => {
  // 匹配 "Will the XXX win the ..." 或 "Will XXX win ..."
  const match = question.match(/Will(?: the)?\s+(.+?)\s+win/i);
  if (match) {
    return match[1].replace(/\?$/, "").trim();
  }
  return null;
};

/**
 * 判断 outcome 是否匹配目标队伍
 */
const isOutcomeMatch = (
  outcomeTitle: string,
  teamNames: string[],
  question: string
): boolean => {
  const normalizedOutcome = outcomeTitle.toLowerCase().trim();

  // Yes/No 二元市场：需要从问题中提取队伍名
  if (normalizedOutcome === "no") {
    return false;
  }

  if (normalizedOutcome === "yes") {
    const teamInQuestion = extractTeamFromQuestion(question);
    if (!teamInQuestion) return false;
    return hasTeamMatch(teamInQuestion, teamNames);
  }

  // 直接匹配队伍名
  return hasTeamMatch(outcomeTitle, teamNames);
};

export const fetchPolymarketOdds = async (
  eventId: string,
  teamId: string
): Promise<number | null> => {
  const slug = getPolymarketSlug(eventId);
  if (!slug) return null;

  const data = await fetchPolymarketViaViteProxy(slug);
  if (!data || Array.isArray(data) || !data.markets?.length) return null;

  const teamNames = [normalizeText(teamId)];

  for (const market of data.markets) {
    for (const outcome of market.outcomes) {
      if (isOutcomeMatch(outcome.title, teamNames, market.question)) {
        return outcome.price;
      }
    }
  }

  return null;
};

export const fetchAllPolymarketOdds = async (
  events: Event[],
  picks: Record<string, string>
): Promise<Record<string, number | null>> => {
  const odds: Record<string, number | null> = {};

  const fetchPromises = events.map(async (event) => {
    const team = findTeam(event, picks[event.id]);
    if (!team) {
      odds[event.id] = null;
      return;
    }

    const slug = getPolymarketSlug(event.id);
    if (!slug) {
      odds[event.id] = null;
      return;
    }

    const data = await fetchPolymarketViaViteProxy(slug);
    if (!data || Array.isArray(data) || !data.markets?.length) {
      odds[event.id] = null;
      return;
    }

    const teamNames = getTeamMatchNames(team);

    for (const market of data.markets) {
      for (const outcome of market.outcomes) {
        if (isOutcomeMatch(outcome.title, teamNames, market.question)) {
          odds[event.id] = outcome.price;
          return;
        }
      }
    }

    odds[event.id] = null;
  });

  await Promise.all(fetchPromises);
  return odds;
};

export type PolymarketEventOdds = {
  selected: Record<string, number | null>;
  all: Record<string, Record<string, number>>;
};

export const fetchPolymarketEventOdds = async (
  events: Event[],
  picks: Record<string, string>
): Promise<PolymarketEventOdds> => {
  const selected: Record<string, number | null> = {};
  const all: Record<string, Record<string, number>> = {};

  await Promise.all(
    events.map(async (event) => {
      const eventOdds = await fetchEventAllOdds(event.id, event.teams);
      all[event.id] = eventOdds;

      const team = findTeam(event, picks[event.id]);
      selected[event.id] = team ? eventOdds[team.id] ?? null : null;
    })
  );

  return { selected, all };
};

export const formatOdds = (odds: number | null): string => {
  if (odds === null) return "N/A";
  const percent = odds * 100;
  if (percent < 0.01) {
    return percent.toFixed(4) + "%";
  } else if (percent < 1) {
    return percent.toFixed(3) + "%";
  } else if (percent < 10) {
    return percent.toFixed(2) + "%";
  } else {
    return percent.toFixed(1) + "%";
  }
};

/**
 * 获取某个赛事所有队伍的实时胜率
 * 返回 { teamId: odds } 映射
 */
export const fetchEventAllOdds = async (
  eventId: string,
  teams: Array<{ id: string; nameZh: string; nameEn: string }>
): Promise<Record<string, number>> => {
  const slug = getPolymarketSlug(eventId);
  if (!slug) return {};

  const data = await fetchPolymarketViaViteProxy(slug);
  if (!data || Array.isArray(data) || !data.markets?.length) return {};

  const odds: Record<string, number> = {};

  for (const team of teams) {
    const teamNames = getTeamMatchNames(team);
    for (const market of data.markets) {
      for (const outcome of market.outcomes) {
        if (isOutcomeMatch(outcome.title, teamNames, market.question)) {
          odds[team.id] = outcome.price;
          break;
        }
      }
    }
  }

  return odds;
};

/**
 * 过滤掉胜率为 0（已淘汰）的队伍
 * 返回新的事件列表
 */
export const getFilteredEvents = async (
  sourceEvents: typeof import("../data/events").events
) => {
  // 并发获取所有赛事的胜率数据
  const oddsMap = await Promise.all(
    sourceEvents.map(async (event) => {
      const odds = await fetchEventAllOdds(event.id, event.teams);
      return { eventId: event.id, odds };
    })
  );

  const oddsByEvent = Object.fromEntries(oddsMap.map(o => [o.eventId, o.odds]));

  // 过滤每个赛事的队伍
  return sourceEvents.map((event) => ({
    ...event,
    teams: event.teams.filter((team) => {
      const odds = oddsByEvent[event.id]?.[team.id];
      // 如果没有获取到数据，保留原样（不删）
      if (odds === undefined) return true;
      // 胜率为 0 = 已淘汰
      return odds > 0;
    }),
  }));
};
