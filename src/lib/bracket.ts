// Bracket proyectado de la fase final, derivado de la tabla EN VIVO usando la
// ESTRUCTURA OFICIAL FIJA del Mundial 2026 (FIFA). No es una siembra genérica:
// cada cruce de 16avos está predefinido por posición de grupo (1º/2º de cada
// grupo + 8 mejores terceros), igual que el cuadro oficial. Las rondas
// siguientes siguen las conexiones fijas de la FIFA (ganador del partido X vs
// ganador del partido Y). Para "proyectar" quién avanza, en cada cruce pasa el
// FAVORITO DEL MODELO (mismo pronóstico que muestran las tarjetas: fuerza por
// ranking + forma real), no la mejor campaña en puntos. Todo se recalcula al
// cargar resultados.
import type { BracketTie, Match, Qualifier, Results, Team } from "../types";
import { standings } from "./logic";
import { buildRatings, predict, type Ratings } from "./model";
import { THIRD_ALLOCATION, THIRD_WINNER_ORDER } from "./thirdAllocation";

interface Round {
  name: string;
  ties: BracketTie[];
}

// Round of 32 = "dieciseisavos" (16avos), no "32avos".
const ROUND_NAMES = ["16avos", "Octavos", "Cuartos", "Semis", "Final"] as const;

// Un lado de un cruce: una posición de grupo concreta (1º/2º de X), un "mejor
// tercero proveniente de uno de estos grupos", o el ganador de un partido previo.
type Slot =
  | { kind: "pos"; pos: 1 | 2; group: string }
  | { kind: "third"; from: string[] }
  | { kind: "winner"; match: number };

interface MatchDef {
  n: number; // número de partido oficial (73..104)
  a: Slot;
  b: Slot;
}

const pos = (pos: 1 | 2, group: string): Slot => ({ kind: "pos", pos, group });
const third = (from: string): Slot => ({ kind: "third", from: from.split("") });
const win = (match: number): Slot => ({ kind: "winner", match });

// 16avos (partidos 73–88): cuadro oficial fijo de la FIFA 2026.
const R32: MatchDef[] = [
  { n: 73, a: pos(2, "A"), b: pos(2, "B") },
  { n: 74, a: pos(1, "E"), b: third("ABCDF") },
  { n: 75, a: pos(1, "F"), b: pos(2, "C") },
  { n: 76, a: pos(1, "C"), b: pos(2, "F") },
  { n: 77, a: pos(1, "I"), b: third("CDFGH") },
  { n: 78, a: pos(2, "E"), b: pos(2, "I") },
  { n: 79, a: pos(1, "A"), b: third("CEFHI") },
  { n: 80, a: pos(1, "L"), b: third("EHIJK") },
  { n: 81, a: pos(1, "D"), b: third("BEFIJ") },
  { n: 82, a: pos(1, "G"), b: third("AEHIJ") },
  { n: 83, a: pos(2, "K"), b: pos(2, "L") },
  { n: 84, a: pos(1, "H"), b: pos(2, "J") },
  { n: 85, a: pos(1, "B"), b: third("EFGIJ") },
  { n: 86, a: pos(1, "J"), b: pos(2, "H") },
  { n: 87, a: pos(1, "K"), b: third("DEIJL") },
  { n: 88, a: pos(2, "D"), b: pos(2, "G") },
];

// Octavos (89–96): conexiones fijas de la FIFA.
const R16: MatchDef[] = [
  { n: 89, a: win(74), b: win(77) },
  { n: 90, a: win(73), b: win(75) },
  { n: 91, a: win(76), b: win(78) },
  { n: 92, a: win(79), b: win(80) },
  { n: 93, a: win(83), b: win(84) },
  { n: 94, a: win(81), b: win(82) },
  { n: 95, a: win(86), b: win(88) },
  { n: 96, a: win(85), b: win(87) },
];

// Cuartos (97–100).
const QF: MatchDef[] = [
  { n: 97, a: win(89), b: win(90) },
  { n: 98, a: win(93), b: win(94) },
  { n: 99, a: win(91), b: win(92) },
  { n: 100, a: win(95), b: win(96) },
];

// Semis (101–102) y Final (104; 103 es el partido por el 3º, fuera del cuadro).
const SF: MatchDef[] = [
  { n: 101, a: win(97), b: win(98) },
  { n: 102, a: win(99), b: win(100) },
];
const FINAL: MatchDef[] = [{ n: 104, a: win(101), b: win(102) }];

// Ganador de grupo -> nº de partido de 16avos donde recibe a un tercero.
// Se deriva del cuadro oficial (R32): cada slot de tercero está emparejado con
// el 1º de un grupo concreto (1A→79, 1B→85, 1D→81, 1E→74, 1G→82, 1I→77,
// 1K→87, 1L→80).
const WINNER_MATCH: Record<string, number> = {};
for (const d of R32) {
  const hasThird = d.a.kind === "third" || d.b.kind === "third";
  const first =
    d.a.kind === "pos" && d.a.pos === 1
      ? d.a.group
      : d.b.kind === "pos" && d.b.pos === 1
        ? d.b.group
        : null;
  if (hasThird && first) WINNER_MATCH[first] = d.n;
}

const ROUNDS: { name: string; defs: MatchDef[] }[] = [
  { name: ROUND_NAMES[0], defs: R32 },
  { name: ROUND_NAMES[1], defs: R16 },
  { name: ROUND_NAMES[2], defs: QF },
  { name: ROUND_NAMES[3], defs: SF },
  { name: ROUND_NAMES[4], defs: FINAL },
];

function byRecord(a: { pts: number; dg: number; gf: number }, b: typeof a): number {
  return b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;
}

// Proyección: en un cruce avanza el FAVORITO del modelo (ranking + forma),
// el mismo pronóstico que muestran las tarjetas. En knockout no hay empate, así
// que comparamos prob. de victoria local vs visitante. Empate del modelo → la
// mejor campaña (siembra) desempata. Devuelve qué lado pasa: "a" | "b" | null.
function pickAdv(
  a: Qualifier | null,
  b: Qualifier | null,
  ratings: Ratings,
): "a" | "b" | null {
  if (!a && !b) return null;
  if (!a) return "b";
  if (!b) return "a";
  const pr = predict({ h: a.name, a: b.name } as unknown as Match, ratings);
  if (pr.pHome === pr.pAway) return a.seed <= b.seed ? "a" : "b";
  return pr.pHome > pr.pAway ? "a" : "b";
}

// Asigna los 8 mejores terceros a los 8 slots de tercero respetando, para cada
// slot, su conjunto oficial de grupos elegibles (y, por construcción, que nadie
// enfrente a un rival de su propio grupo). Backtracking: la FIFA garantiza que
// para cualquiera de las 495 combinaciones existe un emparejamiento válido.
function assignThirds(
  slots: { match: number; from: string[] }[],
  qualifyingGroups: string[],
): Record<number, string> {
  const qualSet = new Set(qualifyingGroups);
  const used = new Set<string>();
  const out: Record<number, string> = {};

  function bt(i: number): boolean {
    if (i === slots.length) return true;
    const slot = slots[i];
    for (const g of slot.from) {
      if (!qualSet.has(g) || used.has(g)) continue;
      used.add(g);
      out[slot.match] = g;
      if (bt(i + 1)) return true;
      used.delete(g);
      delete out[slot.match];
    }
    return false;
  }
  bt(0);
  return out;
}

// Cómo se decide quién avanza en cada cruce:
//  - "model": favorito del modelo (proyección pura).
//  - "result": SOLO avanza el que ganó de verdad (resultado real cargado). Si el
//    partido no se jugó/empató, el slot queda vacío. Es lo que usa el camino al
//    campeón: los países avanzan conforme ganan, no por pronóstico.
//  - "auto": híbrido para el fixture de eliminatorias. Si el cruce ya se jugó,
//    avanza el ganador REAL (incl. penales); si todavía no, proyecta el favorito
//    del modelo. Así los "Próximos" reflejan los resultados ya cargados (un
//    eliminado no sigue apareciendo en rondas siguientes).
export type AdvanceMode = "model" | "result" | "auto";

// Ganador real de un cruce de eliminatorias por su resultado cargado (id "KO-n").
// En knockout no puede quedar empate: si los 90'/120' terminan igualados, decide
// la tanda de penales, guardada aparte como "pen:KO-n" ([1,0] local, [0,1] visita).
function pickAdvResult(
  n: number,
  a: Qualifier | null,
  b: Qualifier | null,
  results: Results,
): "a" | "b" | null {
  if (!a || !b) return null;
  const sc = results["KO-" + n];
  if (!sc) return null;
  if (sc[0] > sc[1]) return "a";
  if (sc[1] > sc[0]) return "b";
  // Empate → definición por penales (si está cargada).
  const pen = results["pen:KO-" + n];
  if (pen) return pen[0] > pen[1] ? "a" : pen[1] > pen[0] ? "b" : null;
  return null;
}

// Asignación OFICIAL de los 8 mejores terceros a sus cruces de 16avos usando la
// tabla fija de la FIFA (Annexe C): para el conjunto concreto de 8 grupos que
// clasifican, cada ganador enfrenta al tercero que el reglamento define, NO un
// emparejamiento válido cualquiera. Esto reproduce el cuadro real (p. ej. con
// terceros de {B,D,E,F,I,J,K,L}, el 1ºE juega contra el 3º del grupo D). Si la
// combinación no estuviera en la tabla, cae al backtracking como red de
// seguridad. Devuelve { nº de partido -> grupo del tercero }.
function assignThirdsOfficial(qualifyingGroups: string[]): Record<number, string> {
  const key = [...qualifyingGroups].sort().join("");
  const row = THIRD_ALLOCATION[key];
  if (!row || row.length !== THIRD_WINNER_ORDER.length) {
    const slots: { match: number; from: string[] }[] = [];
    for (const d of R32) {
      if (d.a.kind === "third") slots.push({ match: d.n, from: d.a.from });
      if (d.b.kind === "third") slots.push({ match: d.n, from: d.b.from });
    }
    return assignThirds(slots, qualifyingGroups);
  }
  const out: Record<number, string> = {};
  THIRD_WINNER_ORDER.forEach((winnerGroup, i) => {
    const matchN = WINNER_MATCH[winnerGroup];
    if (matchN != null) out[matchN] = row[i];
  });
  return out;
}

// Construye el cuadro completo desde la tabla en vivo.
export function buildBracket(
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
  advance: AdvanceMode = "model",
): Round[] {
  const firsts: Record<string, Qualifier> = {};
  const seconds: Record<string, Qualifier> = {};
  const thirdByGroup: Record<string, Qualifier> = {};
  const thirdsList: Qualifier[] = [];

  for (const g of Object.keys(groups)) {
    const st = standings(g, groups, matches, results);
    const mk = (i: number, p: 1 | 2 | 3): Qualifier => ({
      name: st[i]?.name ?? "—",
      group: g,
      pos: p,
      pts: st[i]?.pts ?? 0,
      dg: st[i]?.dg ?? 0,
      gf: st[i]?.gf ?? 0,
      seed: 0,
    });
    firsts[g] = mk(0, 1);
    seconds[g] = mk(1, 2);
    const t = mk(2, 3);
    thirdByGroup[g] = t;
    thirdsList.push(t);
  }

  // Los 8 mejores terceros (por campaña; orden de grupo estable como desempate).
  const rankedThirds = [...thirdsList].sort(byRecord);
  const bestThirds = rankedThirds.slice(0, 8);
  const qualThirdGroups = bestThirds.map((t) => t.group);

  // Ratings del modelo (ranking + forma real) para proyectar quién avanza.
  const ratings = buildRatings(matches, results);

  // Siembra global 1..32 por campaña: solo informativa (se muestra en el slot) y
  // sirve de desempate cuando el modelo da un cruce 50/50.
  const pool = [...Object.values(firsts), ...Object.values(seconds), ...bestThirds];
  pool.sort(
    (a, b) => byRecord(a, b) || a.pos - b.pos || (a.group < b.group ? -1 : a.group > b.group ? 1 : 0),
  );
  pool.forEach((q, i) => {
    q.seed = i + 1;
  });

  // Reparte los terceros clasificados a sus slots con la tabla oficial FIFA.
  const thirdAssign = assignThirdsOfficial(qualThirdGroups);

  const resolve = (slot: Slot, matchN: number, winners: Record<number, Qualifier | null>): Qualifier | null => {
    if (slot.kind === "pos") return (slot.pos === 1 ? firsts : seconds)[slot.group] ?? null;
    if (slot.kind === "third") {
      const g = thirdAssign[matchN];
      return g ? thirdByGroup[g] : null;
    }
    return winners[slot.match] ?? null;
  };

  const winners: Record<number, Qualifier | null> = {};
  const rounds: Round[] = [];
  for (const r of ROUNDS) {
    const ties: BracketTie[] = [];
    for (const d of r.defs) {
      const a = resolve(d.a, d.n, winners);
      const b = resolve(d.b, d.n, winners);
      const real = advance === "model" ? null : pickAdvResult(d.n, a, b, results);
      // "result": solo real. "auto": real si se jugó, si no el modelo. "model": modelo.
      const adv =
        advance === "result" ? real : (real ?? pickAdv(a, b, ratings));
      ties.push({ round: r.name, n: d.n, a, b, adv });
      winners[d.n] = adv === "b" ? b : adv === "a" ? a : null;
    }
    rounds.push({ name: r.name, ties });
  }
  return rounds;
}

// ───────────────────────── Camino al campeón (radial) ─────────────────────────
// El bracket dispuesto en forma RADIAL (póster): los 32 equipos en el anillo
// exterior y cada cruce converge hacia el centro (la copa). Es ESTÉTICO, no una
// predicción: los países avanzan hacia adentro SOLO conforme ganan de verdad
// (resultados reales, advance="result"), y el ganador de cada cruce aparece en su
// nodo. El resaltado dorado es interactivo: lo aplica el componente al equipo que
// clickeás, iluminando su camino hacia la copa. Acá solo se arma la geometría y,
// para ese resaltado, la cadena de partidos (entrada → Final) de cada equipo.

const ALL_DEFS: MatchDef[] = [...R32, ...R16, ...QF, ...SF, ...FINAL];
const DEF_BY_N = new Map(ALL_DEFS.map((d) => [d.n, d]));
const ROUND_OF: Record<number, number> = {};
[R32, R16, QF, SF, FINAL].forEach((defs, ri) =>
  defs.forEach((d) => (ROUND_OF[d.n] = ri)),
);
// Padre de cada cruce (el partido al que va su ganador). 104 (Final) no tiene.
const PARENT_OF: Record<number, number> = {};
for (const def of ALL_DEFS) {
  if (def.a.kind === "winner") PARENT_OF[def.a.match] = def.n;
  if (def.b.kind === "winner") PARENT_OF[def.b.match] = def.n;
}
// Cadena de partidos desde un cruce hasta la Final (inclusive): el "camino" físico.
function chainOf(n: number): number[] {
  const out: number[] = [];
  let cur: number | undefined = n;
  while (cur !== undefined) {
    out.push(cur);
    cur = PARENT_OF[cur];
  }
  return out;
}

// Radio (0..0.5, normalizado al centro) por ronda del NODO de cruce; las banderas
// del anillo exterior viven en LEAF_RADIUS. Final ≈ centro, 16avos hacia el borde.
const NODE_RADIUS = [0.31, 0.25, 0.19, 0.135, 0.07];
const LEAF_RADIUS = 0.435;
const START_ANGLE = -Math.PI / 2; // primer equipo arriba; gira en sentido horario

export interface RoadPoint {
  x: number; // 0..1 (0.5 = centro)
  y: number;
}
export interface RoadLeaf extends RoadPoint {
  key: string; // identificador estable `${n}${side}`
  n: number; // partido de 16avos donde entra
  side: "a" | "b";
  q: Qualifier | null;
  advanced: boolean; // ganó su cruce de 16avos (resultado real)
  chain: number[]; // partidos desde su entrada hasta la Final
}
export interface RoadNode extends RoadPoint {
  n: number;
  round: number; // 0..4
  winner: Qualifier | null; // ganador REAL del cruce (o null si no se definió)
}
export interface RoadLink {
  x1: number; y1: number; x2: number; y2: number;
  parentN: number; // cruce del nodo padre
  childN?: number; // hijo = otro cruce
  childKey?: string; // hijo = una bandera (hoja)
  toCenter?: boolean; // tramo Final → copa
  round: number; // ronda del nodo padre (0..4)
}
export interface ChampionRoad {
  leaves: RoadLeaf[];
  nodes: RoadNode[];
  links: RoadLink[];
  champion: Qualifier | null;
}

const polar = (angle: number, radius: number): RoadPoint => ({
  x: 0.5 + radius * Math.cos(angle),
  y: 0.5 + radius * Math.sin(angle),
});

export function championRoad(
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
): ChampionRoad {
  // Avance por RESULTADOS REALES: un equipo solo pasa de ronda si ganó.
  const rounds = buildBracket(groups, matches, results, "result");
  const tieByN = new Map<number, BracketTie>();
  for (const r of rounds) for (const t of r.ties) tieByN.set(t.n, t);

  const winnerOf = (n: number): Qualifier | null => {
    const t = tieByN.get(n);
    if (!t) return null;
    return t.adv === "a" ? t.a : t.adv === "b" ? t.b : null;
  };
  const champion = winnerOf(104);

  const leaves: RoadLeaf[] = [];
  const nodeByN = new Map<number, RoadNode>();
  let leafIdx = 0;

  // Recorrido en profundidad desde la Final: ubica cada equipo en el anillo
  // exterior en orden de bracket (rivales potenciales quedan contiguos) y cada
  // nodo de cruce en el ángulo medio de sus dos hijos.
  const place = (n: number): number => {
    const def = DEF_BY_N.get(n)!;
    const tie = tieByN.get(n)!;
    const round = ROUND_OF[n];

    const child = (slot: Slot, side: "a" | "b"): number => {
      if (slot.kind === "winner") return place(slot.match);
      // Hoja: una bandera del anillo exterior.
      const angle = START_ANGLE + ((leafIdx + 0.5) / 16) * Math.PI; // 32 hojas en 2π
      leafIdx++;
      const q = side === "a" ? tie.a : tie.b;
      const p = polar(angle, LEAF_RADIUS);
      leaves.push({
        ...p,
        key: `${n}${side}`,
        n,
        side,
        q,
        advanced: (tie.adv ?? null) === side,
        chain: chainOf(n),
      });
      return angle;
    };

    const aAngle = child(def.a, "a");
    const bAngle = child(def.b, "b");
    const angle = (aAngle + bAngle) / 2;
    const p = polar(angle, NODE_RADIUS[round]);
    nodeByN.set(n, { ...p, n, round, winner: winnerOf(n) });
    return angle;
  };
  place(104);

  // Tramos: cada nodo se une a sus dos hijos (nodo o bandera) y la Final al centro.
  const links: RoadLink[] = [];
  for (const def of ALL_DEFS) {
    const node = nodeByN.get(def.n)!;
    const linkTo = (slot: Slot, side: "a" | "b") => {
      if (slot.kind === "winner") {
        const target = nodeByN.get(slot.match)!;
        links.push({
          x1: node.x, y1: node.y, x2: target.x, y2: target.y,
          parentN: def.n, childN: slot.match, round: ROUND_OF[def.n],
        });
      } else {
        const leaf = leaves.find((l) => l.n === def.n && l.side === side)!;
        links.push({
          x1: node.x, y1: node.y, x2: leaf.x, y2: leaf.y,
          parentN: def.n, childKey: leaf.key, round: ROUND_OF[def.n],
        });
      }
    };
    linkTo(def.a, "a");
    linkTo(def.b, "b");
  }
  // Final → copa (centro).
  const finalNode = nodeByN.get(104)!;
  links.push({
    x1: finalNode.x, y1: finalNode.y, x2: 0.5, y2: 0.5,
    parentN: 104, toCenter: true, round: 4,
  });

  return { leaves, nodes: [...nodeByN.values()], links, champion };
}

export interface ThirdRow extends Omit<Qualifier, "seed"> {
  rank: number;
  qualifies: boolean;
}

// Tabla de los terceros, marcando los 8 que clasifican.
export function thirdsTable(
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
): ThirdRow[] {
  const thirds = Object.keys(groups).map((g) => {
    const st = standings(g, groups, matches, results);
    return {
      name: st[2]?.name ?? "—",
      group: g,
      pos: 3 as const,
      pts: st[2]?.pts ?? 0,
      dg: st[2]?.dg ?? 0,
      gf: st[2]?.gf ?? 0,
    };
  });
  thirds.sort(byRecord);
  return thirds.map((t, i) => ({ ...t, rank: i + 1, qualifies: i < 8 }));
}
