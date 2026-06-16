import type { TrackerStats } from "../types";

export function Header({
  stats,
  liveCount,
}: {
  stats: TrackerStats;
  liveCount: number;
}) {
  return (
    <header className="top">
      <div className="wrap">
        <div className="kicker">
          <span className="badge">Prode · modelo Montecarlo</span>
          {liveCount > 0 && (
            <span className="live-dot">
              <i />
              {liveCount} en vivo
            </span>
          )}
        </div>
        <h1>
          <span className="out">Mundial</span> <span className="yr">26</span>
        </h1>
        <p className="sub">
          <b>Fase de grupos</b>
          <span className="sep">·</span>72 partidos
          <span className="sep">·</span>12 grupos
          <span className="sep">·</span>
          <b>USA · Canadá · México</b>
        </p>

        <div className="tracker" aria-label="Resumen de aciertos">
          <div className="stat">
            <div className="k">Ganadores</div>
            <div className="v">
              {stats.winners}
              <small>/{stats.played}</small>
            </div>
            <div className="spark">acertados</div>
          </div>
          <div className="stat">
            <div className="k">Exactos</div>
            <div className="v">{stats.exacts}</div>
            <div className="spark">marcador</div>
          </div>
          <div className="stat accent">
            <div className="k">Aciertos</div>
            <div className="v">
              {stats.pct}
              <small>%</small>
            </div>
            <div className="spark">corriente</div>
          </div>
        </div>
      </div>
    </header>
  );
}
