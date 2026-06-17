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

// Porcentaje normalizado a 0–100 (ESPN a veces da 0–1, a veces 0–100).
function toPct(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round((n <= 1 ? n * 100 : n) * 10) / 10;
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

  // INFO: sede, ciudad, árbitro
  const gi = data?.gameInfo || {};
  const officials = gi.officials || [];
  const refO =
    officials.find((o) => /referee/i.test(o.position?.name || o.position?.displayName || "")) ||
    officials[0];
  const info = {
    venue: gi.venue?.fullName || "",
    city: gi.venue?.address?.city || "",
    country: gi.venue?.address?.country || "",
    referee: refO?.displayName || "",
  };

  // PROBABILIDAD: predictor (pre-partido) o winprobability (en vivo)
  let winprob = null;
  const wp = data?.winprobability;
  if (Array.isArray(wp) && wp.length) {
    const last = wp[wp.length - 1];
    const h = toPct(last.homeWinPercentage);
    const d = toPct(last.tiePercentage);
    if (h != null) {
      const draw = d ?? 0;
      winprob = { home: h, draw, away: Math.max(0, Math.round((100 - h - draw) * 10) / 10), live: true };
    }
  }
  if (!winprob && data?.predictor) {
    const pr = data.predictor;
    const h = toPct(pr.homeTeam?.gameProjection);
    const a = toPct(pr.awayTeam?.gameProjection);
    const d = toPct(pr.homeTeam?.tieProjection ?? pr.tieProjection);
    if (h != null && a != null) {
      winprob = { home: h, draw: d ?? Math.max(0, Math.round((100 - h - a) * 10) / 10), away: a, live: false };
    }
  }

  // ALINEACIONES
  const rosters = data?.rosters || [];
  const lineupOf = (block) => {
    const players = (block?.roster || [])
      .map((r) => ({
        name: r.athlete?.displayName || r.athlete?.shortName || "",
        pos: r.position?.abbreviation || r.position?.name || "",
        num: String(r.jersey ?? r.athlete?.jersey ?? ""),
        starter: !!r.starter,
      }))
      .filter((p) => p.name);
    return { formation: block?.formation || "", players };
  };
  const homeR =
    rosters.find((r) => String(r.team?.id) === homeId) || rosters.find((r) => r.homeAway === "home");
  const awayR =
    rosters.find((r) => String(r.team?.id) === awayId) || rosters.find((r) => r.homeAway === "away");
  let lineups = null;
  if ((homeR?.roster || awayR?.roster) && (homeR || awayR)) {
    lineups = { home: lineupOf(homeR), away: lineupOf(awayR) };
  }

  return json({ events, stats, hs, as, info, winprob, lineups }, 200, 12);
}

// ------------------------- DEBUG (temporal) ---------------------------
// Muestra la estructura real del summary de un partido en vivo (o el primero
// disponible) para mapear bien alineaciones, sede y árbitro.
async function debug(eidParam) {
  let ev;
  if (eidParam) {
    ev = { id: eidParam };
  } else {
    // varios días, para encontrar un partido jugado (con alineaciones).
    const now = new Date();
    const days = [
      ymd(new Date(now.getTime() - 864e5)),
      ymd(now),
    ];
    const sbs = await Promise.all(days.map((d) => espn(`${ROOT}/scoreboard?dates=${d}`).catch(() => null)));
    const evs = [];
    for (const sb of sbs) for (const e of sb?.events || []) evs.push(e);
    ev =
      evs.find((e) => e.status?.type?.state === "in") ||
      evs.find((e) => e.status?.type?.state === "post") ||
      evs[0];
  }
  if (!ev) return json({ error: "no-event" });
  const data = await espn(`${ROOT}/summary?event=${ev.id}`, 5);
  const r0 = Array.isArray(data.rosters) ? data.rosters[0] : null;
  return json({
    eid: ev.id,
    rosters0_full: r0,
    pickcenter0: Array.isArray(data.pickcenter) ? data.pickcenter[0] : data.pickcenter,
    odds0: Array.isArray(data.odds) ? data.odds[0] : data.odds,
  });
}

// ------------------------------- ROUTER -------------------------------

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    if (kind === "debug") return await debug(url.searchParams.get("eid"));
    if (kind === "detail") {
      const eid = url.searchParams.get("eid");
      if (!eid) return json({ error: "no-eid" }, 400);
      return await detail(eid);
    }
    return await scoreboard();
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
