// Cloudflare Pages Function — proxy a la API pública (no oficial) de ESPN.
// GRATIS y SIN KEY. Se llama desde el mismo origen (sin CORS) y con User-Agent
// de navegador, porque ESPN bloquea otros agentes.
//
//   /api/espn                  → scoreboard: { matches: [{ eid, home, away, hs, as, state, clock, date }] }
//   /api/espn?kind=detail&eid= → { events, stats, hs, as } de un partido
//
// state: "pre" (por jugarse) | "in" (en vivo) | "post" (terminado)

const LEAGUE = "fifa.world";
const ROOT = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function json(data, status = 200, maxAge = 15) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${maxAge}`,
    },
  });
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

async function espn(url, ttl = 15) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    cf: { cacheTtl: ttl, cacheEverything: true },
  });
  if (!res.ok) throw new Error("espn " + res.status);
  return res.json();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = parseInt(String(v).replace(/[^\d.-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

// ----------------------------- SCOREBOARD -----------------------------

function parseScoreboard(data, out) {
  for (const ev of data?.events || []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const cs = comp.competitors || [];
    const home = cs.find((c) => c.homeAway === "home") || cs[0];
    const away = cs.find((c) => c.homeAway === "away") || cs[1];
    if (!home || !away) continue;
    const state = ev.status?.type?.state || comp.status?.type?.state || "pre";
    out.push({
      eid: ev.id,
      home: home.team?.displayName || home.team?.name || home.team?.shortDisplayName,
      away: away.team?.displayName || away.team?.name || away.team?.shortDisplayName,
      hs: toNum(home.score),
      as: toNum(away.score),
      state,
      clock: comp.status?.displayClock || ev.status?.displayClock || "",
      date: ev.date || null,
    });
  }
}

async function scoreboard() {
  const now = new Date();
  // ayer, hoy y mañana: cubre finalizados recientes, en vivo y próximos.
  const days = [
    ymd(new Date(now.getTime() - 864e5)),
    ymd(now),
    ymd(new Date(now.getTime() + 864e5)),
  ];
  const results = await Promise.all(
    days.map((d) => espn(`${ROOT}/scoreboard?dates=${d}`).catch(() => null)),
  );
  const matches = [];
  for (const r of results) if (r) parseScoreboard(r, matches);
  const seen = new Set();
  const uniq = [];
  for (const m of matches) {
    if (seen.has(m.eid)) continue;
    seen.add(m.eid);
    uniq.push(m);
  }
  return json({ matches: uniq });
}

// ------------------------------- DETAIL -------------------------------

// nombre técnico de ESPN → [etiqueta en español, esPorcentaje]
const STAT_MAP = {
  possessionPct: ["Posesión", true],
  totalShots: ["Tiros", false],
  shotsOnTarget: ["Al arco", false],
  saves: ["Atajadas", false],
  wonCorners: ["Córners", false],
  foulsCommitted: ["Faltas", false],
  offsides: ["Offsides", false],
  yellowCards: ["Amarillas", false],
  redCards: ["Rojas", false],
  accuratePasses: ["Pases acertados", false],
  totalPasses: ["Pases", false],
  passPct: ["Precisión pases", true],
  effectivePassPct: ["Precisión pases", true],
  crosses: ["Centros", false],
  totalTackles: ["Quites", false],
};
const STAT_ORDER = Object.keys(STAT_MAP);

function statsByName(teamBlock) {
  const map = {};
  for (const s of teamBlock?.statistics || []) {
    if (s?.name != null) map[s.name] = s.displayValue ?? s.value;
  }
  return map;
}

async function detail(eid) {
  const data = await espn(`${ROOT}/summary?event=${eid}`, 12);

  // local/visita por id de equipo (en el header sabemos homeAway).
  const comps = data?.header?.competitions?.[0]?.competitors || [];
  const homeC = comps.find((c) => c.homeAway === "home") || comps[0];
  const awayC = comps.find((c) => c.homeAway === "away") || comps[1];
  const homeId = String(homeC?.team?.id ?? homeC?.id ?? "");
  const awayId = String(awayC?.team?.id ?? awayC?.id ?? "");
  const hs = toNum(homeC?.score);
  const as = toNum(awayC?.score);

  // STATS
  const teams = data?.boxscore?.teams || [];
  const tId = (t) => String(t?.team?.id ?? t?.id ?? "");
  const homeT = teams.find((t) => tId(t) === homeId) || teams[0];
  const awayT = teams.find((t) => tId(t) === awayId) || teams[1];
  const hMap = statsByName(homeT);
  const aMap = statsByName(awayT);

  const stats = [];
  for (const name of STAT_ORDER) {
    if (!(name in hMap) && !(name in aMap)) continue;
    const [label, pct] = STAT_MAP[name];
    const home = String(hMap[name] ?? "0");
    const away = String(aMap[name] ?? "0");
    const hv = toNum(home) ?? 0;
    const av = toNum(away) ?? 0;
    if (hv === 0 && av === 0 && !pct) continue;
    stats.push({ label, home, away, hv, av, pct });
  }

  // TIMELINE (keyEvents)
  const events = (data?.keyEvents || data?.commentary || [])
    .map((k) => {
      const disp = k.clock?.displayValue || k.time?.displayValue || "";
      const min = toNum(String(disp).split("+")[0]) ?? 0;
      const type = k.type?.text || k.type?.name || k.text || "";
      const teamId = String(k.team?.id ?? "");
      const parts = k.participants || [];
      const find = (re) => parts.find((p) => re.test(p.type || ""))?.athlete?.displayName;
      const player = find(/scor|goal/i) || parts[0]?.athlete?.displayName || "";
      const assist = find(/assist/i) || "";
      return { min, type, team: "", player, assist, home: teamId === homeId };
    })
    .filter((e) => e.type)
    .sort((a, b) => a.min - b.min);

  return json({ events, stats, hs, as }, 200, 12);
}

// ------------------------------- ROUTER -------------------------------

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("kind") === "detail") {
      const eid = url.searchParams.get("eid");
      if (!eid) return json({ error: "no-eid" }, 400);
      return await detail(eid);
    }
    return await scoreboard();
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
