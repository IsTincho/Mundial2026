// Poll del estado en vivo. Refresca al montar y cada POLL_MS. Degrada en
// silencio: si la API no responde o no cubre el torneo, todo queda vacío.
import { useEffect, useState } from "react";
import type { Match, Team } from "../types";
import { fetchLive, type LiveFeed } from "../lib/live";

const POLL_MS = 45_000;
const EMPTY: LiveFeed = { live: {}, finals: {} };

export function useLive(matches: Match[], groups: Record<string, Team[]>): LiveFeed {
  const [feed, setFeed] = useState<LiveFeed>(EMPTY);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetchLive(matches, groups).then((f) => {
        if (alive) setFeed(f);
      });
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // matches y groups son constantes del módulo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return feed;
}
