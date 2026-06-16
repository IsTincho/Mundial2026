// Cloudflare Pages Function — proxy a la API pública (no oficial) de ESPN.
// GRATIS y SIN KEY. Trae el scoreboard del Mundial: en vivo, finalizados y
// horarios. Se llama desde el mismo origen (sin CORS) y con User-Agent de
// navegador, porque ESPN bloquea otros agentes.
//
//   /api/espn  → { matches: [{ home, away, hs, as, state, clock, date }] }
//
// state: "pre" (por jugarse) | "in" (en vivo) | "post" (terminado)

const LEAGUE = "fifa.world";
const BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=15",
    },
  });
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

async function fetchDay(dates) {
  const url = dates ? `${BASE}?dates=${dates}` : BASE;
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      accept: "application/json",
    },
    cf: { cacheTtl: 15, cacheEverything: true },
  });
  if (!res.ok) throw new Error("espn " + res.status);
  return res.json();
}

function toNum(v) {
  return v == null || v === "" ? null : parseInt(v, 10);
}

function parseEvents(data, out) {
  for (const ev of data?.events || []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const cs = comp.competitors || [];
    const home = cs.find((c) => c.homeAway === "home") || cs[0];
    const away = cs.find((c) => c.homeAway === "away") || cs[1];
    if (!home || !away) continue;
    const state = ev.status?.type?.state || comp.status?.type?.state || "pre";
    out.push({
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

export async function onRequestGet() {
  try {
    const now = new Date();
    // ayer, hoy y mañana: cubre finalizados recientes, en vivo y próximos,
    // contemplando el corrimiento de zona horaria.
    const days = [
      ymd(new Date(now.getTime() - 864e5)),
      ymd(now),
      ymd(new Date(now.getTime() + 864e5)),
    ];
    const results = await Promise.all(days.map((d) => fetchDay(d).catch(() => null)));
    const matches = [];
    for (const r of results) if (r) parseEvents(r, matches);

    // Dedupe por local+visita+fecha (los días se solapan en la API).
    const seen = new Set();
    const uniq = [];
    for (const m of matches) {
      const k = `${m.home}|${m.away}|${m.date}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(m);
    }
    return json({ matches: uniq });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}
