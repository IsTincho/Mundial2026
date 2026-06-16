// Cliente del proxy /api/af (Cloudflare Pages Function → API-Football).
// Si el proxy responde 503 (sin key) o falla, devuelve null → el front cae
// a TheSportsDB. Es una mejora opcional: cuando hay key, el live es mejor.
import type { Match, Score, Team } from "../types";
import type { MatchDetail } from "./matchDetail";
import { fetchDetail } from "./matchDetail";
import { makeNameMapper } from "./names";

export interface AfLiveEntry {
  score: [number, number] | null;
  elapsed: number | null;
  fid: number;
}

interface AfLiveRaw {
  matches?: {
    fid: number;
    home?: string;
    away?: string;
    hs?: number | null;
    as?: number | null;
    elapsed?: number | null;
    status?: string | null;
  }[];
  error?: string;
}

async function get(path: string, timeoutMs = 6000): Promise<unknown | null> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch(path, ctrl ? { signal: ctrl.signal } : undefined);
    clearTimeout(timer);
    if (res.status === 503) return null; // sin key configurada
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Partidos en vivo del Mundial, mapeados a nuestros matchId. null si no disponible.
export async function afLive(
  matches: Match[],
  groups: Record<string, Team[]>,
): Promise<Record<string, AfLiveEntry> | null> {
  const data = (await get("/api/af?kind=live")) as AfLiveRaw | null;
  if (!data || data.error) return null;
  const mapName = makeNameMapper(groups);
  const out: Record<string, AfLiveEntry> = {};
  for (const ev of data.matches || []) {
    const h = mapName(ev.home);
    const a = mapName(ev.away);
    if (!h || !a) continue;
    const m = matches.find((x) => x.h === h && x.a === a);
    if (!m) continue;
    const score =
      ev.hs == null || ev.as == null ? null : ([ev.hs, ev.as] as [number, number]);
    out[m.id] = { score, elapsed: ev.elapsed ?? null, fid: ev.fid };
  }
  return out;
}

interface AfResultsRaw {
  matches?: {
    home?: string;
    away?: string;
    hs?: number | null;
    as?: number | null;
  }[];
  error?: string;
}

// Resultados FINALIZADOS de todo el torneo, mapeados a nuestros matchId.
// null si no hay key o falla → el front cae a la sync de TheSportsDB.
export async function afResults(
  matches: Match[],
  groups: Record<string, Team[]>,
): Promise<Record<string, Score> | null> {
  const data = (await get("/api/af?kind=results")) as AfResultsRaw | null;
  if (!data || data.error) return null;
  const mapName = makeNameMapper(groups);
  const out: Record<string, Score> = {};
  for (const ev of data.matches || []) {
    const h = mapName(ev.home);
    const a = mapName(ev.away);
    if (!h || !a || ev.hs == null || ev.as == null) continue;
    const m = matches.find((x) => x.h === h && x.a === a);
    if (!m) continue;
    out[m.id] = [ev.hs, ev.as];
  }
  return out;
}

// Detalle (timeline + stats) de un fixture de API-Football. null si falla.
export async function afDetail(fid: number): Promise<MatchDetail | null> {
  const data = (await get(`/api/af?kind=detail&fid=${fid}`, 7000)) as
    | (MatchDetail & { error?: string })
    | null;
  if (!data || data.error || (!data.events?.length && !data.stats?.length)) return null;
  return { events: data.events, stats: data.stats };
}

// Mejor detalle disponible: API-Football si hay fixture id, si no TheSportsDB.
export async function fetchBestDetail(
  afFid?: number | null,
  eventId?: string | null,
): Promise<MatchDetail | null> {
  if (afFid) {
    const d = await afDetail(afFid);
    if (d) return d;
  }
  if (eventId) return fetchDetail(eventId);
  return null;
}
