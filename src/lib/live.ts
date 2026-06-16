// Estado EN VIVO real desde TheSportsDB (gratis, test key pública "123", sin
// backend ni CORS). Trae los partidos del día por deporte y lee `strStatus`
// para detectar los que están en juego, con su marcador en curso. Defensivo:
// timeout y caída en silencio si la red o la cobertura fallan.
import type { LiveMap, Match, Results, Score, Team } from "../types";
import { makeNameMapper } from "./names";

interface DayEvent {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  strSport?: string | null;
  strTimestamp?: string | null;
}

// Normaliza el timestamp de TheSportsDB (UTC sin sufijo) a ISO con Z.
export function toUtcIso(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const s = ts.trim().replace(" ", "T");
  if (!s) return null;
  return /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z";
}

// Estados de "en juego" de TheSportsDB (normalizados a minúscula).
const IN_PLAY = new Set([
  "1h", "2h", "ht", "et", "bt", "live", "playing", "inprogress",
  "in progress", "first half", "second half", "half time", "halftime",
  "extra time", "break time",
]);
// Estados de partido terminado.
const FINISHED = new Set([
  "ft", "aet", "pen", "match finished", "full time", "after extra time",
  "penalties", "afterpenalties", "fulltime",
]);

export interface LiveFeed {
  live: LiveMap;     // partidos en juego ahora (con marcador en curso)
  finals: Results;   // partidos terminados (para rellenar pendientes)
  eventIds: Record<string, string>;  // matchId → idEvent (para el detalle)
  kickoffs: Record<string, string>;  // matchId → kickoff ISO UTC (hora real)
}

const API = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";

function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Fechas a consultar: hoy y mañana (cubre el corrimiento de zona horaria).
function days(now: Date): string[] {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return [toISO(now), toISO(tomorrow)];
}

function parseScore(h?: string | null, a?: string | null): Score | null {
  if (h == null || a == null || h === "" || a === "") return null;
  const hn = parseInt(h, 10);
  const an = parseInt(a, 10);
  if (Number.isNaN(hn) || Number.isNaN(an)) return null;
  return [hn, an];
}

export async function fetchLive(
  matches: Match[],
  groups: Record<string, Team[]>,
  now: Date = new Date(),
): Promise<LiveFeed> {
  const mapName = makeNameMapper(groups);
  const live: LiveMap = {};
  const finals: Results = {};
  const eventIds: Record<string, string> = {};
  const kickoffs: Record<string, string> = {};

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 6000);

  try {
    const results = await Promise.all(
      days(now).map((d) =>
        fetch(`${API}?d=${d}&s=Soccer`, ctrl ? { signal: ctrl.signal } : undefined)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    );
    clearTimeout(timer);

    const events: DayEvent[] = [];
    for (const r of results) {
      const evs = (r && (r as { events?: DayEvent[] }).events) || [];
      events.push(...evs);
    }

    for (const ev of events) {
      const h = mapName(ev.strHomeTeam ?? undefined);
      const a = mapName(ev.strAwayTeam ?? undefined);
      if (!h || !a) continue;
      const m = matches.find((x) => x.h === h && x.a === a);
      if (!m) continue;
      if (ev.idEvent) eventIds[m.id] = ev.idEvent; // detalle disponible para cualquier estado
      const ko = toUtcIso(ev.strTimestamp);
      if (ko) kickoffs[m.id] = ko; // hora real de inicio
      const status = (ev.strStatus || "").trim().toLowerCase();
      const inPlay = IN_PLAY.has(status);
      const done = FINISHED.has(status);
      const score = parseScore(ev.intHomeScore, ev.intAwayScore);
      if (inPlay) live[m.id] = score;
      else if (done && score) finals[m.id] = score;
    }

    return { live, finals, eventIds, kickoffs };
  } catch {
    clearTimeout(timer);
    return { live: {}, finals: {}, eventIds: {}, kickoffs: {} };
  }
}
