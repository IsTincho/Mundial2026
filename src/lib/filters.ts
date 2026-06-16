// Filtros y categorías: estado, confianza, confederación y búsqueda.
import type { Filters, LiveMap, Match, Results, StatusFilter } from "../types";
import { CONFED } from "../data";
import { effResult, isLive, verdict } from "./logic";

export function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// ¿El partido entra en el filtro de estado?
function matchStatus(m: Match, results: Results, live?: LiveMap): StatusFilter {
  if (isLive(m, results, live)) return "live";
  const r = effResult(m, results);
  if (!r) return "pending";
  return verdict(m, results, live) as StatusFilter; // exact | winner | miss
}

export type StatusCounts = Record<StatusFilter, number>;

export function statusCounts(
  matches: Match[],
  results: Results,
  live?: LiveMap,
): StatusCounts {
  const c: StatusCounts = {
    all: matches.length,
    live: 0,
    pending: 0,
    exact: 0,
    winner: 0,
    miss: 0,
  };
  for (const m of matches) c[matchStatus(m, results, live)]++;
  return c;
}

const LOW_CONF = 6;

export function passesFilters(
  m: Match,
  results: Results,
  f: Filters,
  live?: LiveMap,
): boolean {
  if (f.status !== "all" && matchStatus(m, results, live) !== f.status) return false;
  if (f.conf === "low" && m.c >= LOW_CONF) return false;
  if (f.conf === "high" && m.c < LOW_CONF) return false;
  if (f.confed && CONFED[m.h] !== f.confed && CONFED[m.a] !== f.confed) return false;
  if (f.query) {
    const q = norm(f.query);
    const hay =
      norm(m.h).includes(q) ||
      norm(m.a).includes(q) ||
      norm("grupo" + m.g).includes(q) ||
      norm(m.g) === q;
    if (!hay) return false;
  }
  return true;
}

export function filterMatches(
  matches: Match[],
  results: Results,
  f: Filters,
  live?: LiveMap,
): Match[] {
  return matches.filter((m) => passesFilters(m, results, f, live));
}

export const EMPTY_FILTERS: Filters = {
  status: "all",
  conf: "all",
  confed: null,
  query: "",
};

export function filtersActive(f: Filters): boolean {
  return f.status !== "all" || f.conf !== "all" || !!f.confed || !!f.query.trim();
}
