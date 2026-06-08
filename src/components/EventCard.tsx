import { Check, Search } from "lucide-react";
import type { CSSProperties } from "react";
import type { Event } from "../data/events";
import { findTeam, formatDateRange, getEventTiming } from "../utils/predictions";

type EventCardProps = {
  event: Event;
  selectedTeamId?: string;
  onPick: (eventId: string, teamId: string) => void;
  onOpenSelector: (event: Event) => void;
};

export function EventCard({ event, selectedTeamId, onPick, onOpenSelector }: EventCardProps) {
  const selectedTeam = findTeam(event, selectedTeamId);
  const timing = getEventTiming(event);
  const isNbaFinals = event.id === "nba-finals";
  const coverClassName = [
    "event-cover",
    event.id === "nba-finals" ? "nba-finals-cover" : "",
    event.id === "world-cup" ? "world-cup-cover" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const featuredTeams = event.featuredTeamIds
    .map((id) => findTeam(event, id))
    .filter(Boolean);
  const getTeamTitle = (team: NonNullable<typeof selectedTeam>) =>
    event.id === "valorant-masters" ? (team.abbr ?? team.nameZh) : team.nameZh;

  return (
    <article
      className="event-card"
      style={{ "--event-accent": event.accent } as CSSProperties}
    >
      <div className={coverClassName}>
        <img className="event-cover-image" src={event.backgroundImage} alt="" loading="eager" />
        <span>{event.coverLabel}</span>
        <strong>{event.shortName}</strong>
      </div>

      <div className="event-main">
        <div className="event-title-row">
          <div>
            <h2>{event.name}</h2>
            <p>{formatDateRange(event.dateStart, event.dateEnd)}</p>
          </div>
          <span className={`status ${timing.status}`}>{timing.label}</span>
        </div>

        <div className="progress-track" aria-label={`${event.name} 赛事进度`}>
          <span style={{ width: `${timing.progress}%` }} />
        </div>

        {isNbaFinals ? (
          <div className="nba-matchup" aria-label="NBA总决赛冠军选择">
            {event.teams.map((team) => {
              const selected = team.id === selectedTeamId;
              return (
                <button
                  className={`nba-team-card ${selected ? "selected" : ""}`}
                  key={team.id}
                  type="button"
                  onClick={() => onPick(event.id, team.id)}
                  aria-pressed={selected}
                >
                  <img src={team.logo} alt="" />
                  <span>{team.seed}</span>
                  <strong>{team.nameZh}</strong>
                  <small>{team.nameEn}</small>
                  {selected ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className={`selected-block ${selectedTeam ? "" : "unselected"}`}>
              <div className="selected-logo">
                <img src={selectedTeam?.logo ?? "/logos/placeholder.svg"} alt="" />
              </div>
              <div>
                <span>预测冠军</span>
                <strong>{selectedTeam ? getTeamTitle(selectedTeam) : "尚未选择"}</strong>
                <p>{selectedTeam?.nameEn ?? "从下方精选或全部队伍中选择"}</p>
              </div>
            </div>

            <div className="team-strip" aria-label={`${event.name} 精选队伍`}>
              {featuredTeams.map((team) => {
                const selected = team!.id === selectedTeamId;
                return (
                  <button
                    className={`team-chip ${selected ? "selected" : ""}`}
                    key={team!.id}
                    type="button"
                    onClick={() => onPick(event.id, team!.id)}
                    aria-pressed={selected}
                  >
                    <img src={team!.logo} alt="" />
                    <span>{getTeamTitle(team!)}</span>
                    {selected ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>

            <button className="secondary-action" type="button" onClick={() => onOpenSelector(event)}>
              <Search size={16} aria-hidden="true" />
              全部队伍
            </button>
          </>
        )}
      </div>
    </article>
  );
}
