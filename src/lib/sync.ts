// Sync opcional con TheSportsDB (beta, defensivo).
// Solo rellena partidos PENDIENTES (sin semilla ni carga del usuario), con
// timeout, y cae en silencio si algo falla. Nunca pisa datos existentes.
import type { Match, Results, Team } from "../types";
import { effResult } from "./logic";

const NAME_ALIASES: Record<string, string> = {
  "mexico": "México", "south korea": "Corea del Sur", "korea republic": "Corea del Sur",
  "south africa": "Sudáfrica", "czechia": "Chequia", "czech republic": "Chequia",
  "switzerland": "Suiza", "canada": "Canadá", "qatar": "Qatar",
  "bosnia and herzegovina": "Bosnia", "bosnia herzegovina": "Bosnia", "bosnia": "Bosnia",
  "brazil": "Brasil", "morocco": "Marruecos", "scotland": "Escocia", "haiti": "Haití",
  "united states": "EE.UU.", "usa": "EE.UU.", "united states of america": "EE.UU.",
  "turkey": "Turquía", "turkiye": "Turquía", "australia": "Australia", "paraguay": "Paraguay",
  "germany": "Alemania", "ecuador": "Ecuador",
  "ivory coast": "Costa de Marfil", "cote divoire": "Costa de Marfil", "cote d ivoire": "Costa de Marfil",
  "curacao": "Curazao", "netherlands": "Países Bajos", "holland": "Países Bajos",
  "japan": "Japón", "sweden": "Suecia", "tunisia": "Túnez", "belgium": "Bélgica",
  "iran": "Irán", "ir iran": "Irán", "egypt": "Egipto", "new zealand": "Nueva Zelanda",
  "spain": "España", "uruguay": "Uruguay", "saudi arabia": "Arabia Saudita",
  "cape verde": "Cabo Verde", "cabo verde": "Cabo Verde", "france": "Francia",
  "senegal": "Senegal", "norway": "Noruega", "iraq": "Irak", "argentina": "Argentina",
  "austria": "Austria", "algeria": "Argelia", "jordan": "Jordania", "portugal": "Portugal",
  "colombia": "Colombia", "dr congo": "RD Congo", "congo dr": "RD Congo",
  "democratic republic of the congo": "RD Congo", "uzbekistan": "Uzbekistán",
  "england": "Inglaterra", "croatia": "Croacia", "panama": "Panamá", "ghana": "Ghana",
};

function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca diacríticos
    .replace(/[^a-z0-9]/g, "");      // saca todo lo no alfanumérico
}

// Mapa normalizado -> nombre canónico (incluye los propios nombres en español).
function buildAlias(groups: Record<string, Team[]>): Record<string, string> {
  const alias: Record<string, string> = {};
  for (const k of Object.keys(NAME_ALIASES)) alias[norm(k)] = NAME_ALIASES[k];
  for (const g of Object.keys(groups)) {
    for (const t of groups[g]) alias[norm(t[0])] = t[0];
  }
  return alias;
}

interface SportsDbEvent {
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strHomeTeam?: string;
  strAwayTeam?: string;
}

export interface SyncOutcome {
  filled: number;       // partidos completados
  patch: Results;       // nuevas cargas a aplicar
  ok: boolean;          // true si la API respondió
}

const URL = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026";

export async function syncResults(
  matches: Match[],
  results: Results,
  groups: Record<string, Team[]>,
): Promise<SyncOutcome> {
  const alias = buildAlias(groups);
  const mapName = (s: string | undefined): string | null =>
    s ? alias[norm(s)] || null : null;

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 6000);

  try {
    const res = await fetch(URL, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = (await res.json()) as { events?: SportsDbEvent[] };
    clearTimeout(timer);

    const events = data?.events || [];
    const patch: Results = {};
    // Solo partidos rellenables: sin semilla y sin carga del usuario.
    const pending = matches.filter((m) => effResult(m, results) == null);

    for (const ev of events) {
      const hs = ev.intHomeScore;
      const as = ev.intAwayScore;
      if (hs == null || as == null || hs === "" || as === "") continue;
      const h = mapName(ev.strHomeTeam);
      const a = mapName(ev.strAwayTeam);
      if (!h || !a) continue;
      const match = pending.find((m) => m.h === h && m.a === a);
      if (!match) continue;
      patch[match.id] = [parseInt(hs, 10), parseInt(as, 10)];
    }

    return { filled: Object.keys(patch).length, patch, ok: true };
  } catch {
    clearTimeout(timer);
    return { filled: 0, patch: {}, ok: false };
  }
}
