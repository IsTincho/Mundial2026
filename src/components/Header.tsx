import type { TrackerStats } from "../types";
import { useCountUp } from "../hooks/useCountUp";

export function Header({
  stats,
  liveCount,
}: {
  stats: TrackerStats;
  liveCount: number;
}) {
  const winners = useCountUp(stats.winners);
  const played = useCountUp(stats.played);
  const exacts = useCountUp(stats.exacts);
  const pct = useCountUp(stats.pct);

  return (
    <header className="top">
      <span className="cropmark tl" aria-hidden="true" />
      <span className="cropmark tr" aria-hidden="true" />
      <div className="wrap">
        <div className="kicker">
          <span className="badge">Prode · modelo Montecarlo</span>
          {liveCount > 0 && (
            <span className="live-dot">
              <i />
              {liveCount} en vivo
            </span>
          )}
          <span className="edition" aria-hidden="true">
            Ed. №01 · matchday
          </span>
        </div>

        <h1>
          <span className="out">Mundial</span>{" "}
          <span className="yr">
            26
            <span className="stamp" aria-hidden="true">
              fase de grupos
            </span>
          </span>
        </h1>
        <p className="sub">
          <b>72 partidos</b>
          <span className="sep">/</span>12 grupos
          <span className="sep">/</span>
          <b>USA · Canadá · México</b>
        </p>

        <div className="tracker" aria-label="Resumen de aciertos">
          <div className="stat">
            <div className="k">Ganadores</div>
            <div className="v">
              {winners}
              <small>/{played}</small>
            </div>
            <div className="spark">acertados</div>
          </div>
          <div className="stat">
            <div className="k">Exactos</div>
            <div className="v">{exacts}</div>
            <div className="spark">marcador</div>
          </div>
          <div className="stat accent">
            <div className="k">Aciertos</div>
            <div className="v">
              {pct}
              <small>%</small>
            </div>
            <div className="spark">corriente</div>
          </div>
        </div>
      </div>
    </header>
  );
}
