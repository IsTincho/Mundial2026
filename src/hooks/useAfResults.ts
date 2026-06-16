// Poll opcional a API-Football vía /api/af?kind=results. Trae los partidos
// FINALIZADOS de todo el torneo (no solo los de hoy), para que los resultados
// se completen solos. Si no hay key (proxy 503) o falla, queda null y la app
// sigue con la sync de TheSportsDB.
import { useEffect, useState } from "react";
import type { Match, Score, Team } from "../types";
import { afResults } from "../lib/apiFootball";

const POLL_MS = 90_000;

export function useAfResults(
  matches: Match[],
  groups: Record<string, Team[]>,
  enabled = true,
): Record<string, Score> | null {
  const [res, setRes] = useState<Record<string, Score> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRes(null);
      return;
    }
    let alive = true;
    const tick = () =>
      afResults(matches, groups).then((m) => {
        if (alive) setRes(m);
      });
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // matches y groups son constantes del módulo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return res;
}
