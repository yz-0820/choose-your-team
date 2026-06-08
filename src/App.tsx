import { toPng } from "html-to-image";
import { Download, Loader2, Save, Share2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { EventCard } from "./components/EventCard";
import { Poster } from "./components/Poster";
import { TeamSelector } from "./components/TeamSelector";
import { Toast } from "./components/Toast";
import { events as defaultEvents, type Event } from "./data/events";
import {
  decodePicks,
  encodePicks,
  readStoredState,
  writeStoredState,
  type PredictionState,
} from "./utils/predictions";
import { requestAiRoast } from "./utils/aiRoast";
import { fetchAllPolymarketOdds, getFilteredEvents } from "./utils/polymarket";

// 全局事件列表（动态加载，可能包含淘汰过滤后的队伍）
let activeEvents: typeof defaultEvents = defaultEvents;

const normalizePicks = (picks: Record<string, string>) =>
  activeEvents.reduce<Record<string, string>>((next, event) => {
    const picked = picks[event.id];
    if (event.teams.some((team) => team.id === picked)) {
      next[event.id] = picked;
    }
    return next;
  }, {});

const POSTER_SERIAL_KEY = "choose-your-team:poster-serial";

const nextPosterSerial = () => {
  const stored = window.localStorage.getItem(POSTER_SERIAL_KEY);
  const current = Number.parseInt(stored ?? "0", 10);
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
  window.localStorage.setItem(POSTER_SERIAL_KEY, String(next));
  return next;
};

const initialState = (): PredictionState => {
  const params = new URLSearchParams(window.location.search);
  const shared = params.get("p");
  const decoded = shared ? decodePicks(shared) : null;
  if (decoded) {
    const state = { version: 1, picks: normalizePicks(decoded), savedAt: new Date().toISOString() };
    writeStoredState(state);
    return state;
  }

  const stored = readStoredState();
  return stored
    ? { ...stored, picks: normalizePicks(stored.picks) }
    : { version: 1, picks: {}, savedAt: null };
};

function App() {
  const [state, setState] = useState<PredictionState>(initialState);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [toast, setToast] = useState("");
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterSerial, setPosterSerial] = useState<number | null>(null);
  const [aiRoast, setAiRoast] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [, setRefresh] = useState(0);

  // 页面加载时自动过滤已淘汰队伍（胜率为0）
  useEffect(() => {
    getFilteredEvents(defaultEvents).then((filtered) => {
      activeEvents = filtered;
      setRefresh((n) => n + 1);
    });
  }, []);

  // 禁止/允许页面滚动
  useEffect(() => {
    if (posterOpen || activeEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [posterOpen, activeEvent]);

  const pickedCount = useMemo(
    () => activeEvents.filter((event) => Boolean(state.picks[event.id])).length,
    [state.picks],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 1100);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updatePick = (eventId: string, teamId: string) => {
    setState((current) => {
      const next = {
        ...current,
        picks: { ...current.picks, [eventId]: teamId },
        savedAt: new Date().toISOString(),
      };
      writeStoredState(next);
      return next;
    });
  };

  const luckyPick = () => {
    const picks = activeEvents.reduce<Record<string, string>>((next, event) => {
      const team = event.teams[Math.floor(Math.random() * event.teams.length)];
      if (team) {
        next[event.id] = team.id;
      }
      return next;
    }, {});
    const next = { ...state, picks, savedAt: new Date().toISOString() };
    setState(next);
    writeStoredState(next);
    setToast("已随机生成预测");
  };

  const randomEventPick = (eventId: string) => {
    const event = activeEvents.find((item) => item.id === eventId);
    if (!event) return;
    const team = event.teams[Math.floor(Math.random() * event.teams.length)];
    if (!team) return;

    setState((current) => {
      const next = {
        ...current,
        picks: { ...current.picks, [eventId]: team.id },
        savedAt: new Date().toISOString(),
      };
      writeStoredState(next);
      return next;
    });
    setToast(`${event.name} 已随机选择`);
  };

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("p", encodePicks(state.picks));
    return url.toString();
  };

  const sharePrediction = async () => {
    const shareUrl = buildShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "我的冠军预测",
          text: "看看我的冠军预测！",
          url: shareUrl,
        });
      } catch {
        // 用户取消分享，不做处理
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast("分享链接已复制");
      } catch {
        window.prompt("复制分享链接", shareUrl);
      }
    }
  };

  const [posterImageData, setPosterImageData] = useState<string | null>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<Record<string, number | null>>({});
  const [generating, setGenerating] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const canRefresh = refreshCount < 5;

  const generatePoster = async () => {
    if (pickedCount !== activeEvents.length) {
      setToast("请先选满 4 项冠军预测");
      return;
    }

    setGenerating(true);

    // 获取 Polymarket 实时胜率
    const odds = await fetchAllPolymarketOdds(activeEvents, state.picks);
    setPolymarketOdds(odds);

    setAiRoast(null);
    const comment = await requestAiRoast(activeEvents, state.picks, odds);
    setAiRoast(comment);

    setRefreshCount(0);
    setLastRefreshTime(0);

    const serial = nextPosterSerial();
    setPosterSerial(serial);
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    if (!posterRef.current) return;

    const posterElement = posterRef.current;
    posterElement.style.position = 'fixed';
    posterElement.style.top = '0';
    posterElement.style.left = '0';
    posterElement.style.width = 'auto';
    posterElement.style.height = 'auto';
    posterElement.style.transform = 'none';
    posterElement.style.overflow = 'visible';

    const ticketElement = posterElement.querySelector('.poster-ticket') as HTMLElement;
    const elementToCapture = ticketElement || posterElement;

    const dataUrl = await toPng(elementToCapture, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#090a0f",
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        maxWidth: 'none',
        maxHeight: 'none',
        overflow: 'hidden',
      },
    });

    posterElement.style.position = '';
    posterElement.style.top = '';
    posterElement.style.left = '';
    posterElement.style.width = '';
    posterElement.style.height = '';
    posterElement.style.transform = '';
    posterElement.style.overflow = '';

    setGenerating(false);
    setPosterImageData(dataUrl);
    setPosterOpen(true);
    setToast("海报已生成");
  };

  const handleSharePrediction = () => {
    sharePrediction();
  };

  const downloadPoster = async () => {
    if (!posterImageData) return;
    
    try {
      const response = await fetch(posterImageData);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "我的冠军预测.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setToast("图片已保存");
    } catch (e) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
              <title>我的冠军预测</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  background: #000; 
                  padding: 10px; 
                }
                img { 
                  max-width: 100%; 
                  max-height: 100vh; 
                  display: block; 
                }
                .tip {
                  position: fixed;
                  bottom: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  color: #fff;
                  background: rgba(0,0,0,0.7);
                  padding: 10px 20px;
                  border-radius: 20px;
                  font-size: 14px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <img src="${posterImageData}" alt="我的冠军预测" />
              <div class="tip">长按图片可保存到图库</div>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const sharePoster = async () => {
    if (!posterImageData) {
      setToast("请先生成海报");
      return;
    }
    if (navigator.share) {
      try {
        const response = await fetch(posterImageData);
        const blob = await response.blob();
        const file = new File([blob], "我的冠军预测.png", { type: "image/png" });
        await navigator.share({
          title: "我的冠军预测",
          text: "看看我的冠军预测海报！",
          files: [file],
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          // 降级：复制链接
          sharePrediction();
        }
      }
    } else {
      sharePrediction();
    }
  };

  const regenerateAiRoast = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 5000) return;
    setLastRefreshTime(now);
    setRefreshCount((c) => c + 1);
    setAiRoast("正在重新生成...");
    const comment = await requestAiRoast(activeEvents, state.picks, polymarketOdds);
    setAiRoast(comment);
    setToast("AI 锐评已刷新");
  };

  return (
    <>
      <main className="app-shell">
        <div className="page-bg-carousel" aria-hidden="true">
          <div className="page-bg-slide" />
          <div className="page-bg-slide" />
          <div className="page-bg-slide" />
          <div className="page-bg-slide" />
        </div>
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="app-frame">
          <AppHeader
            events={activeEvents}
            picks={state.picks}
            onLuckyPick={luckyPick}
            onRandomEventPick={randomEventPick}
          />

          <div className="event-list" aria-label="赛事冠军预测列表">
            {activeEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selectedTeamId={state.picks[event.id]}
                onPick={updatePick}
                onOpenSelector={setActiveEvent}
              />
            ))}
          </div>

          <div className="bottom-actions">
            <button
              type="button"
              onClick={generatePoster}
              aria-disabled={pickedCount !== activeEvents.length}
              data-disabled={pickedCount !== activeEvents.length}
            >
              <Download size={18} aria-hidden="true" />
              生成你的预测海报
            </button>
            <button className="share-action" type="button" onClick={handleSharePrediction}>
              <Share2 size={18} aria-hidden="true" />
              分享
            </button>
          </div>
        </div>
      </main>

      <TeamSelector
        event={activeEvent}
        selectedTeamId={activeEvent ? state.picks[activeEvent.id] : undefined}
        onClose={() => setActiveEvent(null)}
        onPick={updatePick}
      />

      <div className="poster-offscreen">
        <Poster ref={posterRef} events={activeEvents} picks={state.picks} serialNumber={posterSerial} aiComment={aiRoast} polymarketOdds={polymarketOdds} onRefreshAiRoast={canRefresh ? regenerateAiRoast : undefined} />
      </div>
      {posterOpen && (
        <div className="poster-sheet" role="dialog" aria-modal="true" aria-label="分享海报预览">
          <button className="modal-backdrop" type="button" onClick={() => setPosterOpen(false)} aria-label="关闭海报预览" />
          <section>
            <button className="poster-close-button" type="button" onClick={() => setPosterOpen(false)} aria-label="关闭">
              <X size={18} aria-hidden="true" />
            </button>
            <Poster events={activeEvents} picks={state.picks} serialNumber={posterSerial} aiComment={aiRoast} polymarketOdds={polymarketOdds} onRefreshAiRoast={canRefresh ? regenerateAiRoast : undefined} />
            <div className="poster-actions">
              <button type="button" onClick={downloadPoster} className="poster-action-button save">
                <Save size={18} aria-hidden="true" />
                保存
              </button>
              <button type="button" onClick={sharePoster} className="poster-action-button share">
                <Share2 size={18} aria-hidden="true" />
                分享
              </button>
            </div>
          </section>
        </div>
      )}

      {toast ? <Toast message={toast} /> : null}

      {generating && (
        <div className="poster-generating-overlay" aria-label="海报生成中">
          <Loader2 className="poster-generating-spinner" size={24} aria-hidden="true" />
          <span>请稍等，海报和AI锐评生成中</span>
        </div>
      )}
    </>
  );
}

export default App;
