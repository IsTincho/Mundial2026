// Lógica pura del prode: resultado efectivo, veredicto, tabla y tracker.
// Sin estado ni DOM — recibe `results` (cargas del usuario) por parámetro.
import type {
  LiveMap,
  Match,
  Results,
  Score,
  Standing,
  Team,
  TrackerStats,
  Verdict,
} from "../types";

export function hasUser(m: Match, results: Results): boolean {
  return Object.prototype.hasOwnProperty.call(results, m.id);
}

// Resultado efectivo: la carga del usuario pisa la semilla; si no, la semilla.
export function effResult(m: Match, results: Results): Score | null {
  return hasUser(m, results) ? results[m.id] : m.r;
}

// En vivo si la API lo marca (o, sin liveMap, el flag semilla) y nadie cargó
// nada todavía. La carga del usuario o un resultado semilla pisan el "en vivo".
export function isLive(m: Match, results: Results, live?: LiveMap): boolean {
  const flagged = live
    ? Object.prototype.hasOwnProperty.call(live, m.id)
    : !!m.live;
  return flagged && !hasUser(m, results) && m.r == null;
}

function sign(a: number, b: number): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

export function verdict(m: Match, results: Results, live?: LiveMap): Verdict {
  if (isLive(m, results, live)) return "live";
  const r = effResult(m, results);
  if (!r) return "pending";
  if (r[0] === m.p[0] && r[1] === m.p[1]) return "exact";
  if (sign(r[0], r[1]) === sign(m.p[0], m.p[1])) return "winner";
  return "miss";
}

// Tracker: solo sobre partidos con resultado (excluye live y pendientes).
export function tracker(matches: Match[], results: Results): TrackerStats {
  let played = 0;
  let winners = 0;
  let exacts = 0;
  for (const m of matches) {
    if (isLive(m, results)) continue;
    const r = effResult(m, results);
    if (!r) continue;
    played++;
    const v = verdict(m, results);
    if (v === "exact") {
      exacts++;
      winners++;
    } else if (v === "winner") {
      winners++;
    }
  }
  const pct = played ? Math.round((winners / played) * 100) : 0;
  return { played, winners, exacts, pct };
}

// Tabla del grupo. 3-1-0. Desempate: Pts -> DG -> GF -> orden oficial (estable).
export function standings(
  group: string,
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
): Standing[] {
  const teams: Standing[] = (groups[group] || []).map((t, i) => ({
    name: t[0],
    rank: t[1],
    order: i,
    pj: 0,
    g: 0,
    e: 0,
    p: 0,
    gf: 0,
    gc: 0,
    pts: 0,
    dg: 0,
  }));
  const byName: Record<string, Standing> = {};
  for (const t of teams) byName[t.name] = t;

  for (const m of matches) {
    if (m.g !== group || isLive(m, results)) continue;
    const r = effResult(m, results);
    if (!r) continue;
    const H = byName[m.h];
    const A = byName[m.a];
    if (!H || !A) continue;
    H.pj++;
    A.pj++;
    H.gf += r[0];
    H.gc += r[1];
    A.gf += r[1];
    A.gc += r[0];
    if (r[0] > r[1]) {
      H.g++;
      A.p++;
      H.pts += 3;
    } else if (r[0] < r[1]) {
      A.g++;
      H.p++;
      A.pts += 3;
    } else {
      H.e++;
      A.e++;
      H.pts++;
      A.pts++;
    }
  }
  for (const t of teams) t.dg = t.gf - t.gc;
  teams.sort(
    (a, b) =>
      b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.order - b.order,
  );
  return teams;
}

// Cuenta de partidos jugados (con resultado, excluyendo live) en una lista.
export function playedCount(list: Match[], results: Results): number {
  let n = 0;
  for (const m of list) if (!isLive(m, results) && effResult(m, results)) n++;
  return n;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Split manual del ISO: evita corrimientos por zona horaria.
export function fmtDate(iso: string): string {
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  const dia = parseInt(p[2], 10);
  const mes = parseInt(p[1], 10) - 1;
  return dia + " " + (MESES[mes] || "");
}

export function byDateThenGroup(a: Match, b: Match): number {
  return a.d < b.d ? -1 : a.d > b.d ? 1 : a.g < b.g ? -1 : a.g > b.g ? 1 : 0;
}
