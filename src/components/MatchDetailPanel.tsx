import { useEffect, useState } from "react";
import type { MatchDetail, TimelineEvent } from "../lib/matchDetail";
import { fetchDetail } from "../lib/matchDetail";

const POLL_MS = 30_000;

function eventTag(type: string): { cls: string; label: string } {
  const t = type.toLowerCase();
  if (t === "goal" || t.includes("goal")) return { cls: "goal", label: "Gol" };
  if (t.includes("yellow")) return { cls: "yellow", label: "Amar." };
  if (t.includes("red")) return { cls: "red", label: "Roja" };
  if (t.includes("subst")) return { cls: "sub", label: "Cambio" };
  if (t.includes("var")) return { cls: "sub", label: "VAR" };
  return { cls: "sub", label: type };
}

function Row({ e }: { e: TimelineEvent }) {
  const tag = eventTag(e.type);
  return (
    <div className={"tl-row" + (e.home ? " h" : " a")}>
      <span className="tl-min">{e.min}&apos;</span>
      <span className={"tl-tag " + tag.cls}>{tag.label}</span>
      <span className="tl-player">
        {e.player || e.team}
        {e.assist && <span className="tl-assist"> · {e.assist}</span>}
      </span>
    </div>
  );
}

export function MatchDetailPanel({
  eventId,
  live,
}: {
  eventId: string;
  live: boolean;
}) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setDetail(null);
    const tick = () =>
      fetchDetail(eventId).then((d) => {
        if (!alive) return;
        setDetail(d);
        setLoading(false);
      });
    tick();
    const id = live ? setInterval(tick, POLL_MS) : 0;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [eventId, live]);

  if (loading) {
    return <div className="detail loading">Cargando detalle…</div>;
  }
  if (!detail) {
    return <div className="detail empty">Sin detalle disponible todavía.</div>;
  }

  return (
    <div className="detail">
      {detail.events.length > 0 && (
        <div className="tl">
          <div className="detail-h">
            Minuto a minuto
            {live && <span className="livebadge"><span className="pd" />vivo</span>}
          </div>
          {detail.events.map((e, i) => (
            <Row e={e} key={i} />
          ))}
        </div>
      )}

      {detail.stats.length > 0 && (
        <div className="stbox">
          <div className="detail-h">Estadísticas</div>
          {detail.stats.map((s, i) => {
            const tot = s.hv + s.av;
            const hp = tot > 0 ? Math.round((s.hv / tot) * 100) : 50;
            return (
              <div className="st" key={i}>
                <div className="st-top">
                  <b className={s.hv >= s.av ? "lead" : ""}>{s.home}</b>
                  <span>{s.label}</span>
                  <b className={s.av >= s.hv ? "lead" : ""}>{s.away}</b>
                </div>
                <div className="st-bar">
                  <span className="h" style={{ width: hp + "%" }} />
                  <span className="a" style={{ width: 100 - hp + "%" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
