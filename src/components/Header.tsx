import type { TrackerStats } from "../types";

export function Header({ stats }: { stats: TrackerStats }) {
  return (
    <header className="topbar">
      <div className="wrap">
        <div className="brand">
          <h1>
            Prode <span className="dot">·</span> Mundial 2026
          </h1>
          <span className="sub">Fase de grupos · 72 partidos</span>
        </div>

        <div className="tracker" aria-label="Resumen de aciertos">
          <div className="cell">
            <span className="k">Ganadores</span>
            <span className="v">
              {stats.winners}
              <small>/{stats.played}</small>
            </span>
          </div>
          <div className="cell">
            <span className="k">Exactos</span>
            <span className="v">{stats.exacts}</span>
          </div>
          <div className="cell">
            <span className="k">Aciertos</span>
            <span className="v">
              {stats.pct}
              <small>%</small>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
