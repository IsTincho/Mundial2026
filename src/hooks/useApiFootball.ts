// Poll opcional a API-Football vía el proxy /api/af. Si no hay key (proxy 503)
// o falla, queda null y la app sigue con TheSportsDB.
import { useEffect, useState } from "react";
import type { Match, Team } from "../types";
import { afLive, type AfLiveEntry } from "../lib/apiFootball";

const POLL_MS = 30_000;

export function useApiFootball(
  matches: Match[],
  groups: Record<string, Team[]>,
): Record<string, AfLiveEntry> | null {
  const [live, setLive] = useState<Record<string, AfLiveEntry> | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      afLive(matches, groups).then((m) => {
        if (alive) setLive(m);
      });
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return live;
}
