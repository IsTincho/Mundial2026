// Detalle del partido (timeline + stats) desde TheSportsDB (key pública 123).
// lookuptimeline.php → goles/tarjetas/cambios con minuto, jugador y asistencia.
// lookupeventstats.php → tiros, posesión, atajadas, córners, etc. (según cobertura).
export interface TimelineEvent {
  min: number;
  type: string;       // "Goal" | "subst" | "Yellow Card" | "Red Card" | ...
  team: string;
  player: string;
  assist: string;
  home: boolean;
}

export interface StatRow {
  label: string;
  home: string;
  away: string;
  hv: number;         // valor numérico local (para la barra)
  av: number;
  pct: boolean;       // si es porcentaje (posesión, precisión)
}

export interface MatchInfo {
  venue?: string;
  city?: string;
  country?: string;
  referee?: string;
}

export interface LineupPlayer {
  name: string;
  pos: string;
  num: string;
  starter: boolean;
}

export interface Lineup {
  formation: string;
  players: LineupPlayer[];
}

export interface WinProb {
  home: number; // 0–100
  draw: number;
  away: number;
  live: boolean; // true = en vivo, false = pre-partido (predictor)
}

export interface MatchDetail {
  events: TimelineEvent[];
  stats: StatRow[];
  info?: MatchInfo;
  winprob?: WinProb | null;
  lineups?: { home: Lineup; away: Lineup } | null;
}

const BASE = "https://www.thesportsdb.com/api/v1/json/123";

const STAT_LABELS: Record<string, string> = {
  "Ball Possession": "Posesión",
  "Total Shots": "Tiros",
  "Shots on Goal": "Al arco",
  "Shots off Goal": "Afuera",
  "Blocked Shots": "Bloqueados",
  "Shots insidebox": "En el área",
  "Shots outsidebox": "Fuera del área",
  "Goalkeeper Saves": "Atajadas",
  "Corner Kicks": "Córners",
  "Fouls": "Faltas",
  "Offsides": "Offsides",
  "Yellow Cards": "Amarillas",
  "Red Cards": "Rojas",
  "Passes %": "Precisión pases",
  "Passes Percentage": "Precisión pases",
  "Passes accurate": "Pases acertados",
  "Total passes": "Pases",
};

// Orden de prioridad para mostrar los stats más relevantes primero.
const STAT_ORDER = [
  "Ball Possession", "Total Shots", "Shots on Goal", "Shots off Goal",
  "Goalkeeper Saves", "Corner Kicks", "Fouls", "Yellow Cards", "Red Cards",
  "Passes %", "Passes Percentage",
];

interface RawTl {
  intTime?: string | null;
  strTimeline?: string | null;
  strTeam?: string | null;
  strHome?: string | null;
  strPlayer?: string | null;
  strAssist?: string | null;
}
interface RawStat {
  strStat?: string | null;
  intHome?: string | null;
  intAway?: string | null;
}

function num(v: string | null | undefined): number {
  const n = parseInt(String(v ?? "").replace(/[^\d.-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export async function fetchDetail(idEvent: string): Promise<MatchDetail | null> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 7000);
  const opt = ctrl ? { signal: ctrl.signal } : undefined;

  try {
    const [tlR, stR] = await Promise.all([
      fetch(`${BASE}/lookuptimeline.php?id=${idEvent}`, opt).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE}/lookupeventstats.php?id=${idEvent}`, opt).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    clearTimeout(timer);

    const rawTl: RawTl[] = (tlR && tlR.timeline) || [];
    const events: TimelineEvent[] = rawTl
      .map((e) => ({
        min: num(e.intTime),
        type: (e.strTimeline || "").trim(),
        team: (e.strTeam || "").trim(),
        player: (e.strPlayer || "").trim(),
        assist: (e.strAssist || "").trim(),
        home: String(e.strHome).toLowerCase() === "yes",
      }))
      .filter((e) => e.type)
      .sort((a, b) => a.min - b.min);

    const rawSt: RawStat[] = (stR && stR.eventstats) || [];
    const stats: StatRow[] = rawSt
      .map((s) => {
        const key = (s.strStat || "").trim();
        const home = String(s.intHome ?? "").trim();
        const away = String(s.intAway ?? "").trim();
        return {
          label: STAT_LABELS[key] || key,
          key,
          home,
          away,
          hv: num(home),
          av: num(away),
          pct: home.includes("%") || away.includes("%"),
        };
      })
      .filter((s) => s.label && (s.home !== "" || s.away !== ""))
      .sort((a, b) => {
        const ia = STAT_ORDER.indexOf(a.key);
        const ib = STAT_ORDER.indexOf(b.key);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(({ label, home, away, hv, av, pct }) => ({ label, home, away, hv, av, pct }));

    if (!events.length && !stats.length) return null;
    return { events, stats };
  } catch {
    clearTimeout(timer);
    return null;
  }
}
