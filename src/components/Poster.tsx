import { forwardRef } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import type { Event } from "../data/events";
import { findTeam } from "../utils/predictions";

type PosterProps = {
  events: Event[];
  picks: Record<string, string>;
  serialNumber: number | null;
  aiComment?: string | null;
  polymarketOdds?: Record<string, number | null>;
  onRefreshAiRoast?: () => void;
};

const getPosterLabel = (event: Event) => {
  if (event.id === "cs-cologne-major") return "CS2";
  if (event.id === "valorant-masters") return "VCT";
  if (event.id === "world-cup") return "FIFA";
  return event.shortName;
};

const getTrophyBackground = (event: Event) => {
  if (event.id === "nba-finals") return "/trophies/nba-larry-obrien.jpg";
  if (event.id === "cs-cologne-major") return "/trophies/cs-cologne-trophy.jpg";
  if (event.id === "valorant-masters") return "/trophies/vct-masters-trophy.jpg";
  return "/trophies/fifa-world-cup-trophy.jpg";
};

const getTicketDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    display: `${year}.${month}.${day}`,
    serial: `${year}${month}${day}`,
  };
};

const formatHitRate = (teamCount: number) => {
  const rate = 100 / teamCount;
  const formatted = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(rate);
  return `预测成功率 ${formatted}%`;
};

const formatTotalHitRate = (rate: number) => {
  const percent = rate * 100;
  const formatted = new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: percent < 0.01 ? 4 : 2,
  }).format(percent);
  return `${formatted}%`;
};

const formatTicketSerial = (serialNumber: number | null) =>
  `NO.${String(serialNumber ?? 1).padStart(6, "0")}`;

export const Poster = forwardRef<HTMLDivElement, PosterProps>(function Poster({ events, picks, serialNumber, aiComment, polymarketOdds, onRefreshAiRoast }, ref) {
  const ticketDate = getTicketDate();

  const posterPicks = events.map((event) => {
    const team = findTeam(event, picks[event.id]);
    const polymarketOdd = polymarketOdds?.[event.id];
    const displayHitRate = polymarketOdd !== undefined && polymarketOdd !== null
      ? `实时胜率 ${(polymarketOdd * 100).toFixed(1)}%`
      : formatHitRate(event.teams.length);
    return {
      event,
      label: getPosterLabel(event),
      team,
      teamName: team?.nameZh ?? "待选择",
      logo: team?.logo ?? "/logos/placeholder.svg",
      trophyBackground: getTrophyBackground(event),
      hitRateValue: polymarketOdd !== null && polymarketOdd !== undefined ? polymarketOdd : (1 / event.teams.length),
      teamCount: event.teams.length,
      hitRate: displayHitRate,
    };
  });
  const pickedCount = posterPicks.filter((pick) => pick.team).length;
  const totalHitRateValue =
    pickedCount === events.length
      ? posterPicks.reduce((total, pick) => total * pick.hitRateValue, 1)
      : null;
  // X = 1 / 总胜率，使 1/X 始终与上方百分比对应
  const displayDenominator =
    totalHitRateValue !== null && totalHitRateValue > 0
      ? Math.round(1 / totalHitRateValue)
      : events.reduce((total, event) => total * event.teams.length, 1);

  return (
    <div className="poster" ref={ref}>
      <div className="poster-bg" />
      <div className="poster-ticket" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <header className="poster-ticket-head">
          <div className="ticket-title">
            <span>SPORTS PICK SLIP</span>
            <h2>冠军预测投注单</h2>
          </div>
          <div className="ticket-stamp">
            <div className="ticket-stamp-info">
              <b>{formatTicketSerial(serialNumber)}</b>
              <small>{ticketDate.display}</small>
            </div>
          </div>
          <div className="ticket-qrcode">
            <div className="ticket-qrcode-wrap">
              <img src="/qrcode-share.png" alt="扫码分享" crossOrigin="anonymous" />
            </div>
          </div>
        </header>

        <div className="poster-slip-list" aria-label="冠军预测投注单明细">
          {posterPicks.map((pick) => (
            <div className={`poster-slip-row event-${pick.event.id} ${pick.team ? "" : "unselected"}`} key={pick.event.id}>
              <div
                className="slip-trophy-bg"
                style={{ backgroundImage: `url(${pick.trophyBackground})` }}
                aria-hidden="true"
              />
              <img src={pick.logo} alt="" />
              <div className="slip-copy">
                <span>{pick.label} · {pick.event.name}</span>
                <strong>{pick.teamName}</strong>
              </div>
              <b className="slip-status">{pick.team ? pick.hitRate : "待选择"}</b>
            </div>
          ))}
        </div>

        <div className="total-hit-rate">
          <span>全部预测成功率</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <strong>{totalHitRateValue === null ? "待完成选择" : formatTotalHitRate(totalHitRateValue)}</strong>
            {totalHitRateValue !== null && (
              <small>1/{displayDenominator}</small>
            )}
          </div>
        </div>

        <div className="poster-divider" />

        {aiComment ? (
          <section className="poster-ai-roast" aria-label="AI 锐评">
            <span>AI 锐评</span>
            {onRefreshAiRoast ? (
              <button className="poster-ai-roast-refresh" type="button" onClick={onRefreshAiRoast} aria-label="重新生成AI锐评">
                <RefreshCw size={12} />
              </button>
            ) : null}
            <p>{aiComment}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
});
