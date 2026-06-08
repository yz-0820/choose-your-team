import type { Event, Team } from "../data/events";

export type PredictionState = {
  version: number;
  picks: Record<string, string>;
  savedAt: string | null;
};

export const STORAGE_KEY = "choose-your-team:picks";

const dayMs = 24 * 60 * 60 * 1000;

const beijingDateParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};

const dateToDayNumber = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / dayMs);
};

export const formatDateRange = (start: string, end: string) => {
  const [startYear, startMonth, startDay] = start.split("-");
  const [, endMonth, endDay] = end.split("-");
  return `${startYear}.${startMonth}.${startDay} - ${endMonth}.${endDay}`;
};

export const getEventTiming = (event: Event, now = new Date()) => {
  const today = dateToDayNumber(beijingDateParts(now));
  const start = dateToDayNumber(event.dateStart);
  const end = dateToDayNumber(event.dateEnd);
  const totalDays = Math.max(1, end - start + 1);

  if (today < start) {
    return { label: `未开始 · 还有 ${start - today} 天`, status: "upcoming" as const, progress: 0 };
  }

  if (today > end) {
    return { label: "已结束", status: "ended" as const, progress: 100 };
  }

  const elapsedDays = today - start + 1;
  return {
    label: "进行中",
    status: "live" as const,
    progress: Math.min(100, Math.max(1, Math.round((elapsedDays / totalDays) * 100))),
  };
};

export const findTeam = (event: Event, teamId?: string): Team | undefined =>
  event.teams.find((team) => team.id === teamId);

export const readStoredState = (): PredictionState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PredictionState) : null;
  } catch {
    return null;
  }
};

export const writeStoredState = (state: PredictionState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const encodePicks = (picks: Record<string, string>) => {
  const json = JSON.stringify(picks);
  const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(Number.parseInt(p1, 16)),
  );
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodePicks = (value: string): Record<string, string> | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const binary = atob(padded);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
};
