// Cloudflare Pages Function — proxy a API-Football (api-sports.io).
// Esconde la key (secret API_FOOTBALL_KEY en CF) y normaliza la respuesta.
// Si no hay key configurada → 503; el front cae a TheSportsDB.
//
// Rutas (mismo origen, sin CORS):
//   /api/af?kind=live              → partidos en vivo del Mundial
//   /api/af?kind=detail&fid=ID     → { events, stats } de un fixture
//
// Mundial 2026: league=1, season=2026 en API-Football.

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

const STAT_LABELS = {
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
  "Passes accurate": "Pases acertados",
  "Total passes": "Pases",
  "expected_goals": "xG",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=20",
    },
  });
}

function num(v) {
  const n = parseInt(String(v ?? "").replace(/[^\d.-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

async function af(path, key) {
  const res = await fetch(BASE + path, {
    headers: { "x-apisports-key": key },
    cf: { cacheTtl: 20, cacheEverything: true },
  });
  if (!res.ok) throw new Error("af " + res.status);
  return res.json();
}

export async function onRequestGet({ request, env }) {
  const key = env.API_FOOTBALL_KEY;
  if (!key) return json({ error: "no-key" }, 503);

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");

  try {
    if (kind === "live") {
      const data = await af(`/fixtures?live=all&league=${LEAGUE}&season=${SEASON}`, key);
      const matches = (data.response || []).map((r) => ({
        fid: r.fixture?.id,
        home: r.teams?.home?.name,
        away: r.teams?.away?.name,
        hs: r.goals?.home,
        as: r.goals?.away,
        elapsed: r.fixture?.status?.elapsed ?? null,
        status: r.fixture?.status?.short ?? null,
      }));
      return json({ matches });
    }

    if (kind === "detail") {
      const fid = url.searchParams.get("fid");
      if (!fid) return json({ error: "no-fid" }, 400);
      const [evRes, stRes] = await Promise.all([
        af(`/fixtures/events?fixture=${fid}`, key),
        af(`/fixtures/statistics?fixture=${fid}`, key),
      ]);

      const blocks = stRes.response || [];
      const homeName = blocks[0]?.team?.name;

      const events = (evRes.response || [])
        .map((e) => ({
          min: num(e.time?.elapsed) + (e.time?.extra ? num(e.time.extra) : 0),
          type: e.type === "Card" ? (e.detail || "Card") : e.type || "",
          team: e.team?.name || "",
          player: e.player?.name || "",
          assist: e.assist?.name || "",
          home: (e.team?.name || "") === homeName,
        }))
        .filter((e) => e.type)
        .sort((a, b) => a.min - b.min);

      const homeStats = blocks[0]?.statistics || [];
      const awayStats = blocks[1]?.statistics || [];
      const byType = (arr, t) => arr.find((s) => s.type === t)?.value;
      const types = [...new Set(homeStats.map((s) => s.type))];
      const stats = types
        .map((t) => {
          const h = byType(homeStats, t);
          const a = byType(awayStats, t);
          return {
            label: STAT_LABELS[t] || t,
            home: h == null ? "0" : String(h),
            away: a == null ? "0" : String(a),
            hv: num(h),
            av: num(a),
            pct: String(h).includes("%") || String(a).includes("%"),
          };
        })
        .filter((s) => s.home !== "0" || s.away !== "0");

      return json({ events, stats });
    }

    return json({ error: "bad-kind" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
