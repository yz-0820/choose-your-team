import type { Event } from "../data/events";
import { findTeam } from "./predictions";

const getEventLabel = (event: Event) => {
  if (event.id === "cs-cologne-major") return "CS2";
  if (event.id === "valorant-masters") return "VCT";
  if (event.id === "world-cup") return "FIFA";
  return event.shortName;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;

const getMarketTier = (rank: number, teamCount: number, normalizedOdds: number) => {
  if (teamCount <= 2) {
    if (normalizedOdds >= 0.6) return "夺冠热门";
    if (normalizedOdds >= 0.4) return "均势选择";
    return "下风选择";
  }

  const percentile = rank / teamCount;
  if (rank <= 2) return "夺冠热门";
  if (normalizedOdds < 0.02) return "大冷门";
  if (percentile <= 0.25) return "强势选择";
  if (percentile <= 0.75) return "合理选择";
  return "冷门选择";
};

const getMarketProfile = (
  odds: number,
  eventOdds: Record<string, number> | undefined,
  teamId: string,
  fallbackTeamCount: number,
) => {
  const entries = Object.entries(eventOdds ?? {})
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1]);

  const teamCount = entries.length || fallbackTeamCount;
  const totalOdds = entries.reduce((total, [, value]) => total + value, 0);
  const normalizedOdds = totalOdds > 0 ? odds / totalOdds : odds;
  const rankIndex = entries.findIndex(([id]) => id === teamId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const relativeToAverage = normalizedOdds * teamCount;
  const tier = rank ? getMarketTier(rank, teamCount, normalizedOdds) : "参考不足";

  return {
    rank,
    teamCount,
    tier,
    normalizedOdds,
    relativeToAverage,
  };
};

const cleanComment = (comment: string) => {
  return comment
    .replace(/[\r\n]+/g, " ")
    .replace(/^["""'"「」]+|["""'"「」]+$/g, "")
    .trim();
};

export const buildAiRoastPrompt = (
  events: Event[],
  picks: Record<string, string>,
  polymarketOdds: Record<string, number | null>,
  eventOddsByTeam: Record<string, Record<string, number>> = {},
) => {
  const lines = events
    .map((event) => {
      const team = findTeam(event, picks[event.id]);
      if (!team) return null;
      const teamName = team.nameZh === team.nameEn ? team.nameZh : `${team.nameZh} / ${team.nameEn}`;
      const odd = polymarketOdds?.[event.id];
      let oddText = "";
      if (odd !== undefined && odd !== null) {
        const profile = getMarketProfile(odd, eventOddsByTeam[event.id], team.id, event.teams.length);
        oddText = `（实时胜率 ${formatPercent(odd)}，归一化胜率 ${formatPercent(profile.normalizedOdds)}，市场排名 ${profile.rank ? `第 ${profile.rank}/${profile.teamCount}` : "暂无"}，热门分层：${profile.tier}，相对平均 ${profile.relativeToAverage.toFixed(1)} 倍）`;
      }
      return `- ${getEventLabel(event)} · ${event.name}: ${teamName}${oddText}`;
    });

  if (lines.some((line) => line === null)) return null;

  return [
    "你是中文体育电竞段子手。你已联网，可以根据最新赛事动态调整锐评。",
    `今天是 ${new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}。`,
    "请基于用户的冠军预测组合，生成 1 句中文娱乐锐评。",
    "要求：二十四至四十八个汉字；诙谐、有梗、有趣；",
    "根据市场排名、归一化胜率、热门分层和相对平均值调整语气：夺冠热门/强势选择可以调侃稳健或随大流，均势选择用五五开语气，下风选择/冷门/大冷门可以调侃搏冷或做梦，合理选择用中性吐槽；",
    "结合四项选择之间的强弱反差，制造节目效果，不要机械复述数据；",
    "只锐评选择组合，不攻击国家、民族、地区、球员、选手或真人；不要提真实投注、赌博、赔率；不要输出标题、引号或解释。",
    "用户预测：",
    ...lines,
  ].join("\n");
};

export const requestAiRoast = async (
  events: Event[],
  picks: Record<string, string>,
  polymarketOdds: Record<string, number | null> = {},
  eventOddsByTeam: Record<string, Record<string, number>> = {},
) => {
  const prompt = buildAiRoastPrompt(events, picks, polymarketOdds, eventOddsByTeam);
  if (!prompt) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("/api/ai-roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { comment?: unknown };
    if (typeof data.comment !== "string") return null;

    const comment = cleanComment(data.comment);
    return comment || null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};
