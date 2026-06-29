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
      const adv = pickAdv(a, b, ratings);
      ties.push({ round: r.name, n: d.n, a, b, adv });
      winners[d.n] = adv === "b" ? b : adv === "a" ? a : null;
    }
    rounds.push({ name: r.name, ties });
  }
  return rounds;
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
