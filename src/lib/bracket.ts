// Bracket proyectado de la fase final (32 equipos), derivado de la tabla EN VIVO.
// No inventa marcadores: toma 1º y 2º de cada grupo + los 8 mejores terceros,
// los siembra por campaña (pts → dg → gf) y arma los cruces. Las rondas
// siguientes se proyectan asumiendo que avanza el de mejor siembra. Todo esto
// es una proyección que se recalcula a medida que cargás resultados.
import type { BracketTie, Match, Qualifier, Results, Team } from "../types";
import { standings } from "./logic";

interface Round {
  name: string;
  ties: BracketTie[];
}

const ROUND_NAMES = ["32avos", "Octavos", "Cuartos", "Semis", "Final"];

// Orden de siembra estándar para un bracket de n (potencia de 2).
function seedOrder(n: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < n) {
    const m = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(m - s);
    }
    seeds = next;
  }
  return seeds;
}

function byRecord(a: { pts: number; dg: number; gf: number }, b: typeof a): number {
  return b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;
}

// 32 clasificados proyectados, ya sembrados (seed 1..32).
export function qualifiers(
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
): Qualifier[] {
  const firsts: Omit<Qualifier, "seed">[] = [];
  const seconds: Omit<Qualifier, "seed">[] = [];
  const thirds: Omit<Qualifier, "seed">[] = [];

  for (const g of Object.keys(groups)) {
    const st = standings(g, groups, matches, results);
    const pick = (i: number, pos: 1 | 2 | 3): Omit<Qualifier, "seed"> => ({
      name: st[i]?.name ?? "—",
      group: g,
      pos,
      pts: st[i]?.pts ?? 0,
      dg: st[i]?.dg ?? 0,
      gf: st[i]?.gf ?? 0,
    });
    firsts.push(pick(0, 1));
    seconds.push(pick(1, 2));
    thirds.push(pick(2, 3));
  }

  thirds.sort(byRecord);
  const bestThirds = thirds.slice(0, 8);

  const all = [...firsts, ...seconds, ...bestThirds];
  // Siembra por campaña; el puesto (1º>2º>3º) desempata.
  all.sort((a, b) => byRecord(a, b) || a.pos - b.pos);

  return all.map((q, i) => ({ ...q, seed: i + 1 }));
}

export function buildBracket(quals: Qualifier[]): Round[] {
  const bySeed: Record<number, Qualifier> = {};
  for (const q of quals) bySeed[q.seed] = q;

  const order = seedOrder(32);
  const rounds: Round[] = [];

  // 32avos a partir del orden de siembra.
  let current: (Qualifier | null)[] = order.map((s) => bySeed[s] ?? null);

  for (let r = 0; r < ROUND_NAMES.length; r++) {
    const ties: BracketTie[] = [];
    const winners: (Qualifier | null)[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];
      ties.push({ round: ROUND_NAMES[r], a, b });
      // Proyección: avanza el de mejor siembra (menor número).
      const w = !a ? b : !b ? a : a.seed <= b.seed ? a : b;
      winners.push(w);
    }
    rounds.push({ name: ROUND_NAMES[r], ties });
    current = winners;
    if (current.length < 1) break;
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
