import { useMemo, useState } from "react";
import type { Match, Results, Team } from "../types";
import { championRoad, thirdsTable } from "../lib/bracket";
import { Flag } from "./Flag";

// El "camino al campeón" en forma radial: los 32 equipos en el anillo exterior y
// cada cruce convergiendo hacia la copa del centro. Es estético, no una
// predicción: los países avanzan hacia adentro SOLO conforme ganan de verdad (su
// bandera aparece en el nodo de cada cruce ganado). El dorado es interactivo:
// tocá cualquier equipo y se ilumina su camino hacia la copa.
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

  // Equipo seleccionado (por nombre): ilumina su camino. null = nada resaltado.
  const [sel, setSel] = useState<string | null>(null);
  const pick = (name?: string | null) =>
    setSel((cur) => (name && cur !== name ? name : null));

  // Camino del equipo elegido: su bandera de entrada + la cadena de cruces hacia
  // la copa. Se calcula desde la hoja (entrada) de ese equipo.
  const selLeaf = sel ? road.leaves.find((l) => l.q?.name === sel) : undefined;
  const chain = useMemo(() => new Set(selLeaf?.chain ?? []), [selLeaf]);
  const selKey = selLeaf?.key;
  const isSel = (name?: string | null) => !!sel && !!name && name === sel;

  // Un tramo es dorado si pertenece al camino del equipo elegido.
  const linkGold = (l: (typeof road.links)[number]) => {
    if (!sel) return false;
    if (l.toCenter) return chain.size > 0; // Final → copa
    if (l.childN != null) return chain.has(l.childN); // tramo entre cruces
    return l.childKey === selKey; // tramo bandera → primer cruce
  };

  // viewBox 1000×1000 para las líneas; las banderas son HTML posicionado encima.
  const V = 1000;
  const pct = (v: number) => `${v * 100}%`;
  const champion = road.champion;

  return (
    <div
      className={"champroad" + (sel ? " has-sel" : "")}
      role="group"
      aria-label="Camino al campeón"
      onClick={() => setSel(null)}
    >
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

        {/* Tramos: primero los neutros, el camino elegido por encima */}
        {road.links.map((l, i) =>
          linkGold(l) ? null : (
            <line
              key={"n" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className={"cr-link" + (sel ? " dim" : "")}
            />
          ),
        )}
        {road.links.map((l, i) =>
          linkGold(l) ? (
            <line
              key={"p" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className="cr-link gold"
            />
          ) : null,
        )}

        {/* Nodos de cruce (puntos donde se encuentran dos equipos) */}
        {road.nodes.map((n) => (
          <circle
            key={n.n}
            cx={n.x * V} cy={n.y * V}
            r={n.round >= 3 ? 6 : 4.5}
            className={"cr-node" + (chain.has(n.n) ? " gold" : "")}
          />
        ))}
      </svg>

      {/* Ganadores reales avanzando hacia adentro (un país por cruce ganado).
          La Final (round 4) no se dibuja acá: su ganador es el campeón del centro. */}
      {road.nodes
        .filter((n) => n.winner && n.round < 4)
        .map((n) => (
          <button
            key={"w" + n.n}
            type="button"
            className={
              "cr-flag cr-win" + (isSel(n.winner!.name) ? " sel" : "")
            }
            style={{ left: pct(n.x), top: pct(n.y) }}
            title={`${n.winner!.name} · avanzó`}
            onClick={(e) => {
              e.stopPropagation();
              pick(n.winner!.name);
            }}
          >
            <Flag team={n.winner!.name} size="sm" />
          </button>
        ))}

      {/* Copa / campeón al centro */}
      <div className="cr-trophy">
        {champion ? (
          <button
            type="button"
            className={"cr-champ" + (isSel(champion.name) ? " sel" : "")}
            title={`${champion.name} · campeón`}
            onClick={(e) => {
              e.stopPropagation();
              pick(champion.name);
            }}
          >
            <Flag team={champion.name} size="md" />
            <span className="crown" aria-hidden="true">🏆</span>
          </button>
        ) : (
          <span className="cup" aria-hidden="true">🏆</span>
        )}
      </div>

      {/* Banderas del anillo exterior (todos los clasificados) */}
      {road.leaves.map((l) => {
        if (!l.q) {
          return (
            <span
              key={l.key}
              className="cr-flag tbd"
              style={{ left: pct(l.x), top: pct(l.y) }}
            >
              <span className="dot" />
            </span>
          );
        }
        return (
          <button
            key={l.key}
            type="button"
            className={
              "cr-flag" +
              (isSel(l.q.name) ? " sel" : "") +
              (l.advanced ? " adv" : "")
            }
            style={{ left: pct(l.x), top: pct(l.y) }}
            title={l.q.name}
            onClick={(e) => {
              e.stopPropagation();
              pick(l.q!.name);
            }}
          >
            <Flag team={l.q.name} size="md" />
          </button>
        );
      })}
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
        <span className="ss">tocá un equipo</span>
      </div>
      <p className="bracket-intro">
        Cuadro oficial de la FIFA con los <b>32 clasificados</b> en el anillo y la
        copa en el centro. Cada selección avanza hacia adentro <b>a medida que
        gana</b> (su bandera aparece en cada llave superada) — refleja resultados
        reales, no pronósticos. <b>Tocá cualquier equipo</b> para iluminar en oro
        su camino hacia la copa.
      </p>

      <ChampionRoad groups={groups} matches={matches} results={results} />

      {road.champion && (
        <div className="cr-champ-label">
          <span className="ttl">Campeón</span>
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
