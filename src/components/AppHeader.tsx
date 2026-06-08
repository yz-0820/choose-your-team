import { Dices } from "lucide-react";
import type { Event } from "../data/events";
import { findTeam } from "../utils/predictions";

type AppHeaderProps = {
  events: Event[];
  picks: Record<string, string>;
  onLuckyPick: () => void;
  onRandomEventPick: (eventId: string) => void;
};

const getSummaryLabel = (event: Event) => {
  if (event.id === "cs-cologne-major") return "CS2";
  if (event.id === "valorant-masters") return "VCT";
  if (event.id === "world-cup") return "FIFA";
  return event.shortName;
};

export function AppHeader({ events, picks, onLuckyPick, onRandomEventPick }: AppHeaderProps) {
  return (
    <header className="app-header">
      <section className="prediction-hero" aria-label="我的冠军预测">
        <button className="lucky-button" type="button" onClick={onLuckyPick}>
          <Dices size={15} aria-hidden="true" />
          试试手气
        </button>
        <div className="hero-copy">
          <span className="section-label">我的冠军预测</span>
        </div>
        <div className="mini-picks">
          {events.map((event) => {
            const team = findTeam(event, picks[event.id]);
            return (
              <div className={`mini-pick ${team ? "" : "unselected"}`} key={event.id}>
                <span>{getSummaryLabel(event)}</span>
                <img src={team?.logo ?? "/logos/placeholder.svg"} alt="" />
                <strong>{team?.abbr ?? team?.nameZh ?? "未选择"}</strong>
                <button
                  className="mini-random-button"
                  type="button"
                  onClick={() => onRandomEventPick(event.id)}
                  aria-label={`随机选择${event.name}`}
                >
                  <Dices size={13} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </header>
  );
}
