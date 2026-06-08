import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Event } from "../data/events";

type TeamSelectorProps = {
  event: Event | null;
  selectedTeamId?: string;
  onClose: () => void;
  onPick: (eventId: string, teamId: string) => void;
};

const ALL_REGIONS = "全部";
const worldCupRegionLabels: Record<string, string> = {
  AFC: "亚洲",
  CAF: "非洲",
  CONCACAF: "中北美",
  CONMEBOL: "南美",
  OFC: "大洋洲",
  UEFA: "欧洲",
};

const getRegionLabel = (event: Event, region?: string) => {
  if (!region) return "";
  if (region === ALL_REGIONS) return ALL_REGIONS;
  return event.id === "world-cup" ? (worldCupRegionLabels[region] ?? region) : region;
};

export function TeamSelector({ event, selectedTeamId, onClose, onPick }: TeamSelectorProps) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(ALL_REGIONS);

  useEffect(() => {
    setQuery("");
    setRegion(ALL_REGIONS);
  }, [event?.id]);

  const regions = useMemo(() => {
    if (!event) return [ALL_REGIONS];
    const regionOrder: string[] = [];
    const seen = new Set<string>();
    event.teams.forEach((team) => {
      if (team.region && !seen.has(team.region)) {
        seen.add(team.region);
        regionOrder.push(team.region);
      }
    });
    return [ALL_REGIONS, ...regionOrder];
  }, [event]);

  const teams = useMemo(() => {
    if (!event) return [];
    const normalized = query.trim().toLowerCase();
    return event.teams.filter((team) => {
      const matchRegion = region === ALL_REGIONS || team.region === region;
      const matchQuery =
        !normalized ||
        team.nameZh.toLowerCase().includes(normalized) ||
        team.nameEn.toLowerCase().includes(normalized) ||
        team.abbr?.toLowerCase().includes(normalized);
      return matchRegion && matchQuery;
    });
  }, [event, query, region]);

  if (!event) return null;

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={`${event.name} 全部队伍`}>
      <button className="modal-backdrop" type="button" onClick={onClose} aria-label="关闭队伍选择" />
      <section className={`team-modal ${event.id === "world-cup" ? "world-cup-modal" : ""}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div>
            <span className="section-label">全部队伍</span>
            <h2>{event.name}</h2>
          </div>
          <button className="icon-button light" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索队伍"
          />
        </label>

        <div className="region-tabs" role="tablist" aria-label="队伍分组">
          {regions.map((item) => (
            <button
              key={item}
              type="button"
              className={item === region ? "active" : ""}
              onClick={() => setRegion(item)}
            >
              {getRegionLabel(event, item)}
            </button>
          ))}
        </div>

        {teams.length ? (
          <div className="team-grid">
            {teams.map((team) => {
              const selected = team.id === selectedTeamId;
              return (
                <button
                  className={`team-option ${selected ? "selected" : ""}`}
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onPick(event.id, team.id);
                    onClose();
                  }}
                >
                  <img src={team.logo} alt="" />
                  <strong>{team.nameZh}</strong>
                  <span>{getRegionLabel(event, team.region)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">没有找到匹配的队伍</div>
        )}
      </section>
    </div>
  );
}
