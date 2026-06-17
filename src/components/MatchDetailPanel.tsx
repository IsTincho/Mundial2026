import { useEffect, useState } from "react";
import type { Lineup, MatchDetail, TimelineEvent } from "../lib/matchDetail";
import { fetchBestDetail } from "../lib/apiFootball";

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

function LineupCol({ side, name, lu }: { side: string; name: string; lu: Lineup }) {
  const starters = lu.players.filter((p) => p.starter);
  const subs = lu.players.filter((p) => !p.starter);
  const list = starters.length ? starters : lu.players;
  return (
    <div className={"lu-col " + side}>
      <div className="lu-head">
        <span className="lu-team">{name}</span>
        {lu.formation && <span className="lu-form">{lu.formation}</span>}
      </div>
      <ul className="lu-list">
        {list.map((p, i) => (
          <li key={i}>
            {p.num && <span className="lu-num">{p.num}</span>}
            <span className="lu-name">{p.name}</span>
            {p.pos && <span className="lu-pos">{p.pos}</span>}
          </li>
        ))}
      </ul>
      {starters.length > 0 && subs.length > 0 && (
        <div className="lu-subs">Suplentes: {subs.map((p) => p.name).join(", ")}</div>
      )}
    </div>
  );
}

export function MatchDetailPanel({
  eventId,
  afFid,
  espnEid,
  home,
  away,
  live,
}: {
  eventId: string | null;
  afFid: number | null;
  espnEid: string | null;
  home?: string;
  away?: string;
  live: boolean;
}) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setDetail(null);
    const tick = () =>
      fetchBestDetail(afFid, eventId, espnEid).then((d) => {
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
  }, [eventId, afFid, espnEid, live]);

  if (loading) {
    return <div className="detail loading">Cargando detalle…</div>;
  }
  if (!detail) {
    return <div className="detail empty">Sin detalle disponible todavía.</div>;
  }

  const wp = detail.winprob;
  const info = detail.info;

  return (
    <div className="detail">
      {wp && (
        <div className="wp">
          <div className="detail-h">
            Probabilidad
            <span className={"wp-src" + (wp.live ? " live" : "")}>
              {wp.live ? "en vivo" : "pre-partido"}
            </span>
          </div>
          <div className="wp-bar" aria-hidden="true">
            <span className="ph" style={{ width: wp.home + "%" }} />
            <span className="pd" style={{ width: wp.draw + "%" }} />
            <span className="pa" style={{ width: wp.away + "%" }} />
          </div>
          <div className="wp-labs">
            <span className="pl"><b>{Math.round(wp.home)}%</b> {home}</span>
            <span className="pm">Empate <b>{Math.round(wp.draw)}%</b></span>
            <span className="pr">{away} <b>{Math.round(wp.away)}%</b></span>
          </div>
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

      {detail.lineups && (detail.lineups.home.players.length > 0 || detail.lineups.away.players.length > 0) && (
        <div className="lu">
          <div className="detail-h">Alineaciones</div>
          <div className="lu-grid">
            <LineupCol side="h" name={home || "Local"} lu={detail.lineups.home} />
            <LineupCol side="a" name={away || "Visita"} lu={detail.lineups.away} />
          </div>
        </div>
      )}

      {info && (info.venue || info.referee) && (
        <div className="ginfo">
          {info.venue && (
            <span>🏟 {info.venue}{info.city ? ` · ${info.city}` : ""}</span>
          )}
          {info.referee && <span>🧑‍⚖️ {info.referee}</span>}
        </div>
      )}
    </div>
  );
}
