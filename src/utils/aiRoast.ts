import type { Event } from "../data/events";
import { findTeam } from "./predictions";

const getEventLabel = (event: Event) => {
  if (event.id === "cs-cologne-major") return "CS2";
  if (event.id === "valorant-masters") return "VCT";
  if (event.id === "world-cup") return "FIFA";
  return event.shortName;
};

/**
 * 根据胜率和参赛队伍数计算热门度
 * 热门度 = 实际胜率 / 平均胜率（1/队伍数）
 * >= 2.0 倍平均: 热门
 * >= 1.0 倍平均: 正常
 * >= 0.5 倍平均: 偏冷
 * < 0.5 倍平均: 大冷
 */
const getPopularityLabel = (odds: number, teamCount: number): string => {
  const avgOdds = 1 / teamCount;
  const ratio = odds / avgOdds;
  if (ratio >= 2.0) return "热门";
  if (ratio >= 1.0) return "正常";
  if (ratio >= 0.5) return "偏冷";
  return "大冷";
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
  polymarketOdds: Record<string, number | null>
) => {
  const lines = events
    .map((event) => {
      const team = findTeam(event, picks[event.id]);
      if (!team) return null;
      const teamName = team.nameZh === team.nameEn ? team.nameZh : `${team.nameZh} / ${team.nameEn}`;
      const odd = polymarketOdds?.[event.id];
      let oddText = "";
      if (odd !== undefined && odd !== null) {
        const label = getPopularityLabel(odd, event.teams.length);
        oddText = `（实时胜率 ${(odd * 100).toFixed(1)}%，${label}，共 ${event.teams.length} 支队伍竞争）`;
      }
      return `- ${getEventLabel(event)} · ${event.name}: ${teamName}${oddText}`;
    });

  if (lines.some((line) => line === null)) return null;

  return [
    "你是中文体育电竞段子手。你已联网，可以根据最新赛事动态调整锐评。",
    `今天是 ${new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}。`,
    "请基于用户的冠军预测组合，生成 1 句中文娱乐锐评。",
    "要求：二十四至四十八个汉字；诙谐、有梗、有趣；",
    "根据热门度调整语气——热门队伍用'押注稳了''随大流'的语气，大冷队伍用'搏冷门''做梦'的语气，正常队伍用中性吐槽；",
    "结合实时胜率和队伍实力，制造反差感或吐槽感；",
    "只锐评选择组合，不攻击国家、民族、地区、球员、选手或真人；不要提真实投注、赌博、赔率；不要输出标题、引号或解释。",
    "用户预测：",
    ...lines,
  ].join("\n");
};

export const requestAiRoast = async (
  events: Event[],
  picks: Record<string, string>,
  polymarketOdds: Record<string, number | null> = {}
) => {
  const prompt = buildAiRoastPrompt(events, picks, polymarketOdds);
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
