// Lee el proxy /api/espn (API pública de ESPN, gratis y sin key) y lo mapea a
// nuestros matchId. Provee en vivo, finalizados, horarios y minuto/estado.
// Defensivo: timeout y caída en silencio si la red o el mapeo fallan.
import type { LiveMap, Match, Results, Score, Team } from "../types";
import type { MatchDetail } from "./matchDetail";
import { makeNameMapper } from "./names";

interface EspnMatch {
  eid?: string;
  home?: string;
  away?: string;
  hs?: number | null;
  as?: number | null;
  state?: string; // pre | in | post
  clock?: string;
  date?: string | null;
}

export interface EspnFeed {
  live: LiveMap;
  finals: Results;
  kickoffs: Record<string, string>;
  progress: Record<string, string>;
  eventIds: Record<string, string>; // matchId → ESPN event id (para el detalle)
}

export const EMPTY_ESPN: EspnFeed = {
  live: {},
  finals: {},
  kickoffs: {},
  progress: {},
  eventIds: {},
};

export async function fetchEspn(
  matches: Match[],
  groups: Record<string, Team[]>,
): Promise<EspnFeed> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 6000);

  try {
    const res = await fetch("/api/espn", ctrl ? { signal: ctrl.signal } : undefined);
    clearTimeout(timer);
    if (!res.ok) return EMPTY_ESPN;
    const data = (await res.json()) as { matches?: EspnMatch[]; error?: string };
    if (!data || data.error) return EMPTY_ESPN;

    const mapName = makeNameMapper(groups);
    const feed: EspnFeed = { live: {}, finals: {}, kickoffs: {}, progress: {}, eventIds: {} };

    for (const ev of data.matches || []) {
      const h = mapName(ev.home);
      const a = mapName(ev.away);
      if (!h || !a) continue;
      // Coincidencia en cualquier orden (la API puede invertir local/visita).
      let m = matches.find((x) => x.h === h && x.a === a);
      let flipped = false;
      if (!m) {
        m = matches.find((x) => x.h === a && x.a === h);
        flipped = true;
      }
      if (!m) continue;

      if (ev.eid) feed.eventIds[m.id] = ev.eid;
      if (ev.date) feed.kickoffs[m.id] = ev.date; // hora real (ISO con zona)

      const hs = ev.hs;
      const as = ev.as;
      const score: Score | null =
        hs == null || as == null ? null : flipped ? [as, hs] : [hs, as];

      if (ev.state === "in") {
        feed.live[m.id] = score;
        const c = (ev.clock || "").trim();
        if (c) feed.progress[m.id] = c;
      } else if (ev.state === "post" && score) {
        feed.finals[m.id] = score;
      }
    }

    return feed;
  } catch {
    clearTimeout(timer);
    return EMPTY_ESPN;
  }
}

// Detalle de un partido (timeline + stats) desde ESPN. null si no hay datos.
export async function espnDetail(eid: string): Promise<MatchDetail | null> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 7000);
  try {
    const res = await fetch(`/api/espn?kind=detail&eid=${eid}`, ctrl ? { signal: ctrl.signal } : undefined);
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as (MatchDetail & { error?: string }) | null;
    if (!data || data.error || (!data.events?.length && !data.stats?.length)) return null;
    return {
      events: data.events,
      stats: data.stats,
      info: data.info,
      winprob: data.winprob,
      lineups: data.lineups,
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}
