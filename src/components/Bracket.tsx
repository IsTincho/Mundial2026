import { useMemo, useState } from "react";
import type { Match, Results, Team } from "../types";
import { championRoad, thirdsTable } from "../lib/bracket";
import { TEAM_COLOR } from "../data";
import { Flag } from "./Flag";

// Trofeo del Mundial en oro, dibujado a mano (SVG, sin assets externos): globo
// terráqueo arriba sostenido por el cuerpo acanalado que se abre hacia la base.
function Trophy() {
  return (
    <svg
      className="cr-cup-svg"
      viewBox="0 0 100 150"
      role="img"
      aria-label="Copa del Mundo"
    >
      <defs>
        <linearGradient id="cr-gold" x1="18%" y1="4%" x2="82%" y2="98%">
          <stop offset="0%" stopColor="#FFE9B0" />
          <stop offset="34%" stopColor="#FFC54E" />
          <stop offset="62%" stopColor="#C9861F" />
          <stop offset="100%" stopColor="#F4CE72" />
        </linearGradient>
        <linearGradient id="cr-gold-hi" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Cuerpo acanalado: cuello estrecho bajo el globo y base acampanada */}
      <path
        fill="url(#cr-gold)"
        d="M41 43 C 39 62, 33 84, 20 110 Q 19 115 24 115 L 76 115 Q 81 115 80 110 C 67 84, 61 62, 59 43 Z"
      />
      {/* Globo terráqueo */}
      <circle cx="50" cy="27" r="18" fill="url(#cr-gold)" />
      <ellipse cx="50" cy="27" rx="7.5" ry="18" fill="none" stroke="rgba(120,72,10,.42)" strokeWidth="1.2" />
      <line x1="32" y1="27" x2="68" y2="27" stroke="rgba(120,72,10,.42)" strokeWidth="1.2" />
      {/* Estrías del cuerpo */}
      <path d="M45 46 C 42 66, 35 88, 27 110" fill="none" stroke="rgba(120,72,10,.32)" strokeWidth="1.1" />
      <path d="M55 46 C 58 66, 65 88, 73 110" fill="none" stroke="rgba(120,72,10,.32)" strokeWidth="1.1" />
      {/* Base */}
      <rect x="22" y="115" width="56" height="12" rx="4" fill="url(#cr-gold)" />
      <rect x="30" y="127" width="40" height="9" rx="3" fill="url(#cr-gold)" />
      {/* Brillo lateral */}
      <path d="M42 45 C 40 63, 33 85, 23 110" fill="none" stroke="url(#cr-gold-hi)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Color de una selección para su ruta (o plateado si no está en el mapa).
const teamColor = (name?: string | null) =>
  (name && TEAM_COLOR[name]) || "#C7C9CE";

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

  // Ganador REAL de cada nodo de cruce (por nº de partido), para pintar rutas.
  const winnerByN = useMemo(() => {
    const m = new Map<number, string>();
    for (const n of road.nodes) if (n.winner) m.set(n.n, n.winner.name);
    return m;
  }, [road.nodes]);

  // Color del equipo que RECORRIÓ este tramo (avanzó por él), o null si el cruce
  // hijo aún no tiene ganador real. Da el look multicolor del póster.
  const linkWinColor = (l: (typeof road.links)[number]): string | null => {
    if (l.toCenter) return road.champion ? teamColor(road.champion.name) : null;
    if (l.childN != null) {
      const w = winnerByN.get(l.childN);
      return w ? teamColor(w) : null;
    }
    // Tramo bandera → primer cruce: se pinta si esa bandera ganó su 16avo.
    const leaf = road.leaves.find((x) => x.key === l.childKey);
    return leaf?.advanced && leaf.q ? teamColor(leaf.q.name) : null;
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
            <stop offset="0%" stopColor="rgba(255,222,150,.6)" />
            <stop offset="22%" stopColor="rgba(255,197,78,.34)" />
            <stop offset="52%" stopColor="rgba(255,181,74,.09)" />
            <stop offset="100%" stopColor="rgba(255,181,74,0)" />
          </radialGradient>
        </defs>

        {/* Halo dorado detrás de la copa (resplandor central estilo póster) */}
        <circle cx={V / 2} cy={V / 2} r={V * 0.46} fill="url(#cr-core)" />

        {/* Tramos: 1) neutros, 2) rutas ganadoras en color de equipo, 3) camino elegido en oro */}
        {road.links.map((l, i) =>
          linkGold(l) || linkWinColor(l) ? null : (
            <line
              key={"n" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className={"cr-link" + (sel ? " dim" : "")}
            />
          ),
        )}
        {road.links.map((l, i) => {
          const c = linkWinColor(l);
          return c && !linkGold(l) ? (
            <line
              key={"w" + i}
              x1={l.x1 * V} y1={l.y1 * V}
              x2={l.x2 * V} y2={l.y2 * V}
              className={"cr-link win" + (sel ? " dim" : "")}
              style={{ stroke: c }}
            />
          ) : null;
        })}
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
        {road.nodes.map((n) => {
          const c = n.winner ? teamColor(n.winner.name) : null;
          return (
            <circle
              key={n.n}
              cx={n.x * V} cy={n.y * V}
              r={n.round >= 3 ? 6 : 4.5}
              className={"cr-node" + (chain.has(n.n) ? " gold" : c ? " win" : "")}
              style={c && !chain.has(n.n) ? { fill: c, stroke: c } : undefined}
            />
          );
        })}
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
            style={{
              left: pct(n.x),
              top: pct(n.y),
              ["--ring" as string]: teamColor(n.winner!.name),
            }}
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
          <Trophy />
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
