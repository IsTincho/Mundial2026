import { useMemo } from "react";
import type { Match, Results, Team } from "../types";
import { championRoad, thirdsTable } from "../lib/bracket";
import { Flag } from "./Flag";

// El "camino al campeón" en forma radial: 32 banderas en el anillo exterior, cada
// cruce convergiendo hacia la copa del centro. El camino del campeón proyectado
// (la cadena de favoritos que llega a la Final) se enciende en oro.
function ChampionRoad({
  groups,
  matches,
  results,
}: {
  groups: Record<string, Team[]>;
  matches: Match[];
  results: Results;
}) {
  const road = useMemo(
    () => championRoad(groups, matches, results),
    [groups, matches, results],
  );

  // viewBox 1000×1000 para las líneas; las banderas son HTML posicionado encima.
  const V = 1000;
  const pct = (v: number) => `${v * 100}%`;

  return (
    <div className="champroad" role="img" aria-label="Camino al campeón">
      <svg
        className="cr-lines"
        viewBox={`0 0 ${V} ${V}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cr-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,213,120,.55)" />
            <stop offset="35%" stopColor="rgba(255,181,74,.20)" />
            <stop offset="100%" stopColor="rgba(255,181,74,0)" />
          </radialGradient>
        </defs>

        {/* Halo dorado detrás de la copa */}
        <circle cx={V / 2} cy={V / 2} r={V * 0.34} fill="url(#cr-core)" />

        {/* Tramos normales primero, el camino al campeón encima */}
        {road.links
          .filter((l) => !l.onPath)
          .map((l, i) => (
            <line
              key={"n" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className="cr-link"
            />
          ))}
        {road.links
          .filter((l) => l.onPath)
          .map((l, i) => (
            <line
              key={"p" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className="cr-link gold"
            />
          ))}

        {/* Nodos de cruce (puntos donde se encuentran dos equipos) */}
        {road.nodes.map((n) => (
          <circle
            key={n.n}
            cx={n.x * V} cy={n.y * V}
            r={n.round >= 3 ? 7 : 5}
            className={"cr-node" + (n.onPath ? " gold" : "")}
          />
        ))}
      </svg>

      {/* Copa al centro */}
      <div className="cr-trophy" aria-hidden="true">
        <span className="cup">🏆</span>
      </div>

      {/* Banderas en el anillo exterior */}
      {road.leaves.map((l) => (
        <div
          key={l.n + l.side}
          className={
            "cr-flag" +
            (l.onPath ? " champ" : l.adv ? " adv" : "") +
            (l.q ? "" : " tbd")
          }
          style={{ left: pct(l.x), top: pct(l.y) }}
          title={l.q ? l.q.name : "A definir"}
        >
          {l.q ? (
            <Flag team={l.q.name} size="md" />
          ) : (
            <span className="dot" />
          )}
        </div>
      ))}
    </div>
  );
}

export function Bracket({
  groups,
  matches,
  results,
}: {
  groups: Record<string, Team[]>;
  matches: Match[];
  results: Results;
}) {
  const thirds = useMemo(
    () => thirdsTable(groups, matches, results),
    [groups, matches, results],
  );
  const road = useMemo(
    () => championRoad(groups, matches, results),
    [groups, matches, results],
  );

  return (
    <section>
      <div className="sectionhead">
        <span className="bar3" />
        <h2>Camino al campeón</h2>
        <span className="ss">proyección en vivo</span>
      </div>
      <p className="bracket-intro">
        Cuadro oficial de la FIFA proyectado desde la <b>tabla en vivo</b>: cada
        cruce de 16avos está fijado por posición (1º y 2º de cada grupo más los{" "}
        <b>8 mejores terceros</b>), igual que el bracket real. Para proyectar quién
        pasa, en cada llave avanza el <b>favorito del modelo</b> (fuerza por ranking
        + forma real), el mismo pronóstico de las tarjetas. El camino dorado marca
        al campeón proyectado — se recalcula al cargar resultados.
      </p>

      <ChampionRoad groups={groups} matches={matches} results={results} />

      {road.champion && (
        <div className="cr-champ-label">
          <span className="ttl">Campeón proyectado</span>
          <span className="who">
            <Flag team={road.champion.name} size="md" />
            {road.champion.name}
          </span>
        </div>
      )}

      <div className="sectionhead">
        <span className="bar3" />
        <h2>Mejores terceros</h2>
        <span className="ss">clasifican 8 de 12</span>
      </div>
      <div className="table thirds">
        <div className="th">
          <span className="r">#</span>
          <span>Equipo · Grupo</span>
          <span className="r">GF</span>
          <span className="r">DG</span>
          <span className="r">Pts</span>
        </div>
        {thirds.map((t) => (
          <div className={"tr " + (t.qualifies ? "q" : "out")} key={t.group}>
            <span className="pos">{t.rank}</span>
            <div className="tm">
              <span className="nm">
                <Flag team={t.name} size="sm" />
                {t.name}
              </span>
              <span className="rec">Grupo {t.group}</span>
            </div>
            <span className="num">{t.gf}</span>
            <span className="num">
              {(t.dg > 0 ? "+" : t.dg < 0 ? "−" : "") + Math.abs(t.dg)}
            </span>
            <span className="pts">{t.pts}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
