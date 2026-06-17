import { useEffect, useState } from "react";
import type { Match, Score } from "../types";
import type { MatchDetail, StatRow } from "../lib/matchDetail";
import { fetchBestDetail } from "../lib/apiFootball";
import { Flag } from "./Flag";

const POLL_MS = 30_000;

export interface LiveItem {
  m: Match;
  score: Score | null;
  eventId?: string;
  afFid?: number;
  espnEid?: string;
  espnFlip?: boolean;
  progress?: string;
}

function fmtProgress(p?: string): string {
  if (!p) return "En juego";
  const t = p.trim().toLowerCase();
  if (t === "ht" || t.includes("half")) return "Entretiempo";
  if (/^\d+$/.test(t)) return p + "'";
  return p;
}

function topStats(stats: StatRow[]): StatRow[] {
  const want = ["Posesión", "Al arco", "Tiros"];
  const picked: StatRow[] = [];
  for (const w of want) {
    const s = stats.find((x) => x.label === w);
    if (s) picked.push(s);
    if (picked.length >= 2) break;
  }
  return picked;
}

function LiveCard({ item, onOpen }: { item: LiveItem; onOpen: (id: string) => void }) {
  const { m, score, eventId, afFid, espnEid, espnFlip, progress } = item;
  const [detail, setDetail] = useState<MatchDetail | null>(null);

  useEffect(() => {
    if (!eventId && !afFid && !espnEid) return;
    let alive = true;
    const tick = () => fetchBestDetail(afFid, eventId, espnEid, espnFlip).then((d) => alive && setDetail(d));
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eventId, afFid, espnEid, espnFlip]);

  const stats = detail ? topStats(detail.stats) : [];
  const lastGoal = detail?.events.filter((e) => /goal/i.test(e.type)).slice(-1)[0];

  return (
    <button type="button" className="livecard" onClick={() => onOpen(m.id)}>
      <div className="lc-top">
        <span className="lc-tag"><span className="pd" />En vivo</span>
        <span className="lc-min">{fmtProgress(progress)}</span>
        <span className="lc-grp">Grupo {m.g}</span>
      </div>

      <div className="lc-main">
        <div className="lc-team">
          <Flag team={m.h} size="lg" />
          <span className="lc-nm">{m.h}</span>
        </div>
        <div className="lc-score">
          {score ? `${score[0]} : ${score[1]}` : "· : ·"}
        </div>
        <div className="lc-team">
          <Flag team={m.a} size="lg" />
          <span className="lc-nm">{m.a}</span>
        </div>
      </div>

      {lastGoal && (
        <div className="lc-goal">
          <span className="g">Gol</span> {lastGoal.min}&apos; {lastGoal.player}
          {lastGoal.assist && <span className="as"> · {lastGoal.assist}</span>}
        </div>
      )}

      {stats.length > 0 && (
        <div className="lc-stats">
          {stats.map((s, i) => {
            const tot = s.hv + s.av;
            const hp = tot > 0 ? Math.round((s.hv / tot) * 100) : 50;
            return (
              <div className="lc-stat" key={i}>
                <div className="lc-st-top">
                  <b>{s.home}</b><span>{s.label}</span><b>{s.away}</b>
                </div>
                <div className="lc-st-bar">
                  <span className="h" style={{ width: hp + "%" }} />
                  <span className="a" style={{ width: 100 - hp + "%" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <span className="lc-cta">Ver detalle →</span>
    </button>
  );
}

export function LiveNow({
  items,
  onOpen,
}: {
  items: LiveItem[];
  onOpen: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="livenow" aria-label="Partidos en vivo">
      <div className="livenow-h">
        <span className="pulse" />
        En vivo ahora
        <span className="cnt">{items.length}</span>
      </div>
      <div className="livenow-grid">
        {items.map((it) => (
          <LiveCard item={it} key={it.m.id} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
