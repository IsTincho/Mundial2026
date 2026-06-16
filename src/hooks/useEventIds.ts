// Mapa matchId → idEvent de TheSportsDB (para pedir el detalle del partido).
// Una sola consulta a eventsseason al montar. Defensivo: si falla, queda {}.
import { useEffect, useState } from "react";
import type { Match, Team } from "../types";
import { makeNameMapper } from "../lib/names";
import { toUtcIso } from "../lib/live";

const URL = "https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4429&s=2026";

interface SeasonEvent {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strTimestamp?: string | null;
}

export interface SeasonInfo {
  ids: Record<string, string>;
  kickoffs: Record<string, string>;
}

export function useEventIds(
  matches: Match[],
  groups: Record<string, Team[]>,
): SeasonInfo {
  const [info, setInfo] = useState<SeasonInfo>({ ids: {}, kickoffs: {} });

  useEffect(() => {
    let alive = true;
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), 7000);
    const mapName = makeNameMapper(groups);

    fetch(URL, ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        clearTimeout(timer);
        if (!alive || !data) return;
        const events: SeasonEvent[] = data.events || [];
        const ids: Record<string, string> = {};
        const kickoffs: Record<string, string> = {};
        for (const ev of events) {
          const h = mapName(ev.strHomeTeam);
          const a = mapName(ev.strAwayTeam);
          if (!h || !a) continue;
          const m = matches.find((x) => x.h === h && x.a === a);
          if (!m) continue;
          if (ev.idEvent) ids[m.id] = ev.idEvent;
          const ko = toUtcIso(ev.strTimestamp);
          if (ko) kickoffs[m.id] = ko;
        }
        setInfo({ ids, kickoffs });
      })
      .catch(() => clearTimeout(timer));

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return info;
}
