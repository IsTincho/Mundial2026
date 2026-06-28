// Poll a la API pública de ESPN vía /api/espn (gratis, sin key). Refresca al
// montar y cada POLL_MS. Es la fuente principal de EN VIVO y horarios.
import { useEffect, useState, type MutableRefObject } from "react";
import type { Match, Team } from "../types";
import { fetchEspn, type EspnFeed, EMPTY_ESPN } from "../lib/espn";

const POLL_MS = 30_000;

// `matchesRef` se lee en cada poll para cubrir también las eliminatorias
// (equipos proyectados que cambian con la tabla en vivo).
export function useEspn(
  matchesRef: MutableRefObject<Match[]>,
  groups: Record<string, Team[]>,
): EspnFeed {
  const [feed, setFeed] = useState<EspnFeed>(EMPTY_ESPN);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetchEspn(matchesRef.current, groups).then((f) => {
        if (alive) setFeed(f);
      });
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // matchesRef es estable; groups es constante del módulo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return feed;
}
