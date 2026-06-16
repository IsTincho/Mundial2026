import type { Match, Results } from "../types";
import { effResult, fmtDate, isLive, verdict } from "../lib/logic";
import { Chip, Score } from "./Score";

function ariaLabel(m: Match, results: Results): string {
  const v = verdict(m, results);
  const vl: Record<string, string> = {
    exact: "pronóstico exacto",
    winner: "ganador acertado",
    miss: "fallado",
    live: "en vivo",
    pending: "pendiente",
  };
  const r = effResult(m, results);
  const real = isLive(m, results)
    ? "en juego"
    : r
      ? `resultado ${r[0]} a ${r[1]}`
      : "sin resultado";
  return (
    `Grupo ${m.g}, fecha ${m.f}. ${m.h} contra ${m.a}. ` +
    `Mi pronóstico ${m.p[0]} a ${m.p[1]}. ${real}. ` +
    `Veredicto: ${vl[v]}. Tocá para cargar o editar el resultado.`
  );
}

export function Ticket({
  m,
  results,
  onOpen,
}: {
  m: Match;
  results: Results;
  onOpen: (id: string) => void;
}) {
  const r = effResult(m, results);
  const live = isLive(m, results);
  const vd = verdict(m, results);
  const conf = typeof m.c === "number" ? m.c : 0;
  const pct = Math.max(0, Math.min(100, conf * 10));

  return (
    <button
      type="button"
      className={"ticket v-" + vd}
      aria-label={ariaLabel(m, results)}
      onClick={() => onOpen(m.id)}
    >
      <div className="t-meta">
        <div className="tags">
          <span className="tag grp">Grupo {m.g}</span>
          <span className="tag">Fecha {m.f}</span>
          <span className="tag">{fmtDate(m.d)}</span>
        </div>
        <Chip v={vd} />
      </div>

      <div className="t-perf" />

      <div className="t-teams">
        <span className="team home">{m.h}</span>
        <span className="vs">vs</span>
        <span className="team away">{m.a}</span>
      </div>

      <div className="t-board">
        <div className="read">
          <span className="rk">Mi prode</span>
          <Score a={m.p[0]} b={m.p[1]} kind="amber" />
        </div>
        <div className="bdiv" />
        <div className="read">
          <span className="rk">Real</span>
          {live ? (
            <span className="live-now">En vivo</span>
          ) : r ? (
            <Score a={r[0]} b={r[1]} kind="ink" />
          ) : (
            <span className="pend">⏳</span>
          )}
        </div>
      </div>

      <div className="t-conf">
        <span className="cl">Conf</span>
        <span className="bar">
          <span className="fill" style={{ width: pct + "%" }} />
        </span>
        <span className="cv">{conf.toFixed(1)}</span>
      </div>
    </button>
  );
}
