// Sync opcional con TheSportsDB (beta, defensivo).
// Solo rellena partidos PENDIENTES (sin semilla ni carga del usuario), con
// timeout, y cae en silencio si algo falla. Nunca pisa datos existentes.
import type { Match, Results, Team } from "../types";
import { effResult } from "./logic";
import { makeNameMapper } from "./names";

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
  const mapName = makeNameMapper(groups);

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
      const hn = parseInt(hs, 10);
      const an = parseInt(as, 10);
      // Coincidencia en cualquier orden: la API puede tener el local/visitante
      // invertido respecto de la semilla. Si está al revés, damos vuelta el
      // marcador para respetar el local/visita de NUESTRO fixture.
      const direct = pending.find((m) => m.h === h && m.a === a);
      if (direct) {
        patch[direct.id] = [hn, an];
        continue;
      }
      const flip = pending.find((m) => m.h === a && m.a === h);
      if (flip) patch[flip.id] = [an, hn];
    }

    return { filled: Object.keys(patch).length, patch, ok: true };
  } catch {
    clearTimeout(timer);
    return { filled: 0, patch: {}, ok: false };
  }
}
