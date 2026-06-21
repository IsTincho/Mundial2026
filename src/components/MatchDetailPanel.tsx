import { useEffect, useState } from "react";
import type { Lineup, MatchDetail, TimelineEvent } from "../lib/matchDetail";
import type { Prediction } from "../lib/model";
import { fetchBestDetail } from "../lib/apiFootball";

const POLL_MS = 30_000;

function ProbRow({ label, h, d, a }: { label: string; h: number; d: number; a: number }) {
  return (
    <div className="wp-row">
      <span className="wp-rl">{label}</span>
      <span className="wp-bar" aria-hidden="true">
        <span className="ph" style={{ width: h + "%" }} />
        <span className="pd" style={{ width: d + "%" }} />
        <span className="pa" style={{ width: a + "%" }} />
      </span>
      <span className="wp-rv">
        <b className="pl">{Math.round(h)}</b>
        <b className="pm">{Math.round(d)}</b>
        <b className="pr">{Math.round(a)}</b>
      </span>
    </div>
  );
}

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
  espnFlip,
  home,
  away,
  pred,
  live,
}: {
  eventId: string | null;
  afFid: number | null;
  espnEid: string | null;
  espnFlip: boolean;
  home?: string;
  away?: string;
  pred?: Prediction | null;
  live: boolean;
}) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setDetail(null);
    const tick = () =>
      fetchBestDetail(afFid, eventId, espnEid, espnFlip).then((d) => {
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
  }, [eventId, afFid, espnEid, espnFlip, live]);

  if (loading) {
    return <div className="detail loading">Cargando detalle…</div>;
  }
  if (!detail) {
    return <div className="detail empty">Sin detalle disponible todavía.</div>;
  }

  const wp = detail.winprob;
  const info = detail.info;

  // "Valor": dónde el modelo da bastante más probabilidad que el mercado.
  let edge: { label: string; d: number } | null = null;
  if (pred && wp) {
    const cand = [
      { label: home || "el local", d: pred.pHome * 100 - wp.home },
      { label: "el empate", d: pred.pDraw * 100 - wp.draw },
      { label: away || "la visita", d: pred.pAway * 100 - wp.away },
    ].sort((a, b) => b.d - a.d)[0];
    if (cand.d >= 8) edge = { label: cand.label, d: Math.round(cand.d) };
  }

  return (
    <div className="detail">
      {(wp || pred) && (
        <div className="wp dsec">
          <div className="detail-h">
            Probabilidad
            <span className="wp-src">modelo vs mercado</span>
          </div>
          {pred && (
            <ProbRow
              label="Modelo"
              h={pred.pHome * 100}
              d={pred.pDraw * 100}
              a={pred.pAway * 100}
            />
          )}
          {wp && (
            <ProbRow
              label={wp.live ? "En vivo" : "Mercado"}
              h={wp.home}
              d={wp.draw}
              a={wp.away}
            />
          )}
          <div className="wp-labs">
            <span className="pl">{home}</span>
            <span className="pm">Empate</span>
            <span className="pr">{away}</span>
          </div>
          {pred && (
            <div className="wp-xg">
              xG modelo · {pred.xgHome.toFixed(1)} – {pred.xgAway.toFixed(1)}
            </div>
          )}
          {edge && (
            <div className="wp-edge">
              <span className="z">VALOR</span> el modelo le da <b>+{edge.d} pts</b> a {edge.label} vs el mercado
            </div>
          )}
        </div>
      )}

      {detail.stats.length > 0 && (
        <div className="stbox dsec">
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
        <div className="tl dsec">
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
        <div className="lu dsec">
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
