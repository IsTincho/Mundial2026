import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ConfFilter,
  Filters,
  Match,
  Results,
  StatusFilter,
  View,
  ViewMode,
} from "./types";
import { CONFEDS, GROUPS, MATCHES, UPDATED } from "./data";
import {
  fmtDate,
  hasUser,
  isLive,
  penKey,
  playedCount,
  tracker,
} from "./lib/logic";
import {
  EMPTY_FILTERS,
  filterMatches,
  filtersActive,
  statusCounts,
} from "./lib/filters";
import { syncResults } from "./lib/sync";
import { buildRatings, predict } from "./lib/model";
import { buildKnockout } from "./lib/knockout";
import { useResults } from "./hooks/useResults";
import { useLive } from "./hooks/useLive";
import { useEventIds } from "./hooks/useEventIds";
import { useApiFootball } from "./hooks/useApiFootball";
import { useAfResults } from "./hooks/useAfResults";
import { useEspn } from "./hooks/useEspn";
import { Header } from "./components/Header";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { Pager } from "./components/Pager";
import type { PageInfo } from "./components/Pager";
import { MatchCard } from "./components/MatchCard";
import { MatchRow } from "./components/MatchRow";
import { Standings } from "./components/Standings";
import { Bracket } from "./components/Bracket";
import { Editor } from "./components/Editor";
import { LiveNow, type LiveItem } from "./components/LiveNow";
import { useToast } from "./components/Toast";

const GRUPOS = Object.keys(GROUPS);

// API-Football suspendido: el plan Free de la cuenta no da acceso a la
// temporada 2026 ("Free plans do not have access to this season"). La app usa
// TheSportsDB como única fuente. Poner en true cuando haya plan pago para
// reactivar live minuto a minuto, resultados y detalle vía API-Football.
const USE_API_FOOTBALL = false;

export default function App() {
  const { results, setScore, clearScore, applyPatch, resetAll } = useResults();
  // Fixture completo (grupos + eliminatorias proyectadas). Se completa más
  // abajo; las fuentes en vivo lo leen por ref para cubrir también la fase final.
  const allMatchesRef = useRef<Match[]>(MATCHES);
  const { live: sdbLive, finals, eventIds: liveEventIds, kickoffs: liveKo, progress: sdbProgress } = useLive(allMatchesRef, GROUPS);
  const afLiveMap = useApiFootball(MATCHES, GROUPS, USE_API_FOOTBALL);
  // Finalizados de todo el torneo desde API-Football (si hay key). Se mergean
  // como los `finals` de TheSportsDB: cobertura de días pasados, no solo hoy.
  const afFinals = useAfResults(MATCHES, GROUPS, USE_API_FOOTBALL);
  // ESPN (gratis, sin key): fuente principal de EN VIVO, horarios y finalizados.
  const espn = useEspn(allMatchesRef, GROUPS);
  // Precedencia del live: TheSportsDB < ESPN < API-Football (si hay key).
  const liveMap = useMemo(() => {
    const m = { ...sdbLive, ...espn.live };
    if (afLiveMap) for (const id in afLiveMap) m[id] = afLiveMap[id].score;
    return m;
  }, [sdbLive, espn.live, afLiveMap]);
  const progress = useMemo(() => {
    const m = { ...sdbProgress, ...espn.progress };
    if (afLiveMap) {
      for (const id in afLiveMap) {
        const e = afLiveMap[id].elapsed;
        if (e != null) m[id] = String(e);
      }
    }
    return m;
  }, [sdbProgress, espn.progress, afLiveMap]);
  const afFids = useMemo(() => {
    const m: Record<string, number> = {};
    if (afLiveMap) for (const id in afLiveMap) m[id] = afLiveMap[id].fid;
    return m;
  }, [afLiveMap]);
  const season = useEventIds(MATCHES, GROUPS);
  // IDs de evento + horarios reales: eventsday (hoy, incluye live) + eventsseason.
  const eventIds = useMemo(
    () => ({ ...season.ids, ...liveEventIds }),
    [season, liveEventIds],
  );
  const kickoffs = useMemo(
    () => ({ ...season.kickoffs, ...liveKo, ...espn.kickoffs }),
    [season, liveKo, espn.kickoffs],
  );
  // Resultados efectivos: tus cargas pisan los finales de la API; ambos pisan
  // la semilla (manejada dentro de effResult). Los finales NO se persisten.
  // Orden de precedencia: finales TheSportsDB < ESPN < API-Football (si hay
  // key) < cargas del usuario.
  const eff = useMemo(
    () => ({ ...finals, ...espn.finals, ...(afFinals || {}), ...results }),
    [finals, espn.finals, afFinals, results],
  );
  const [view, setView] = useState<View>("fecha");
  const [timeTab, setTimeTab] = useState<"prev" | "today" | "next">("today");
  const [mode, setMode] = useState<ViewMode>("cards");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState<{ fecha: number; grupo: number }>({ fecha: 0, grupo: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast, node: toastNode } = useToast();

  // Sync automática de resultados (temporada completa de TheSportsDB) al cargar
  // y cada 5 min. Es el respaldo cuando no hay key de API-Football: rellena
  // partidos pendientes de días pasados sin tener que apretar ningún botón.
  // Solo completa lo que falta (nunca pisa cargas del usuario ni la semilla).
  const effRef = useRef(eff);
  effRef.current = eff;
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const out = await syncResults(MATCHES, effRef.current, GROUPS);
      if (alive && out.ok && out.filled > 0) applyPatch(out.patch);
    };
    run();
    const id = setInterval(run, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // applyPatch es estable (useCallback); effRef siempre tiene el eff actual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir los finales de ESPN: apenas ESPN da un resultado, lo guardamos
  // (si no lo cargaste vos), para que el partido no vuelva a verse pendiente
  // aunque salga de la ventana de fechas de ESPN.
  const resultsRef = useRef(results);
  resultsRef.current = results;
  useEffect(() => {
    const p: Results = {};
    for (const id in espn.finals) {
      // Solo persistimos finales de GRUPOS. Los de eliminatorias (KO-… y su
      // tanda de penales pen:KO-…) quedan como capa en vivo: si la proyección
      // cambia los equipos, no queda pegado un resultado viejo a un cruce que
      // ahora es otro.
      if (id.startsWith("KO-") || id.startsWith("pen:KO-")) continue;
      if (!(id in resultsRef.current)) p[id] = espn.finals[id];
    }
    if (Object.keys(p).length) applyPatch(p);
    // applyPatch es estable; resultsRef siempre tiene el valor actual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espn.finals]);

  // Ratings del modelo (forma real + ranking). Se recalculan al cambiar los
  // resultados → re-análisis automático de los partidos que faltan. Se calculan
  // SOLO con los partidos de grupos (los de eliminatorias son proyección).
  const ratings = useMemo(() => buildRatings(MATCHES, eff), [eff]);

  // Eliminatorias proyectadas desde la tabla en vivo, con pronóstico del modelo.
  const koMatches = useMemo(
    () => buildKnockout(GROUPS, MATCHES, eff, ratings),
    [eff, ratings],
  );
  // Fixture completo: grupos + fase final. Es lo que se muestra en las vistas
  // por fecha y lo que leen las fuentes en vivo (vía allMatchesRef).
  const allMatches = useMemo(() => [...MATCHES, ...koMatches], [koMatches]);
  allMatchesRef.current = allMatches;

  const stats = useMemo(() => tracker(allMatches, eff), [allMatches, eff]);
  const liveItems = useMemo<LiveItem[]>(
    () =>
      allMatches.filter((m) => isLive(m, eff, liveMap)).map((m) => ({
        m,
        score: liveMap[m.id] ?? null,
        eventId: eventIds[m.id],
        afFid: afFids[m.id],
        espnEid: espn.eventIds[m.id],
        espnFlip: espn.flips[m.id],
        progress: progress[m.id],
      })),
    [allMatches, eff, liveMap, eventIds, progress, afFids, espn.eventIds, espn.flips],
  );
  const liveCount = liveItems.length;
  const counts = useMemo(() => statusCounts(allMatches, eff, liveMap), [allMatches, eff, liveMap]);
  const active = filtersActive(filters);
  const editMatch = useMemo(
    () => allMatches.find((m) => m.id === editId) ?? null,
    [allMatches, editId],
  );

  // --- helpers de filtros ---
  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const onStatus = (s: StatusFilter) => patch({ status: filters.status === s ? "all" : s });
  const onConf = () => patch({ conf: (filters.conf === "low" ? "all" : "low") as ConfFilter });
  const onConfed = (c: string) => patch({ confed: filters.confed === c ? null : c });
  const onQuery = (q: string) => patch({ query: q });
  const onClear = () => setFilters(EMPTY_FILTERS);

  // Orden cronológico real: por hora de kickoff (ESPN) cuando existe; si no,
  // por fecha semilla; desempate por número oficial de partido. Así el orden
  // SIEMPRE coincide con los horarios que se muestran.
  const koMs = (m: Match) => {
    const k = kickoffs[m.id];
    const t = k ? Date.parse(k) : Date.parse(m.d + "T12:00:00Z");
    return Number.isNaN(t) ? 0 : t;
  };
  const byKickoff = (a: Match, b: Match) => koMs(a) - koMs(b) || a.n - b.n;

  // Bucket por momento relativo a HOY (zona local del usuario).
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const timeBucket = (m: Match): "prev" | "today" | "next" => {
    const t = koMs(m);
    if (t < todayStart) return "prev";
    if (t >= todayStart + 864e5) return "next";
    return "today";
  };

  // --- resultados de filtro (modo plano, sin paginación) ---
  const filtered = useMemo(
    () => filterMatches(allMatches, eff, filters, liveMap).slice().sort(byKickoff),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMatches, eff, filters, liveMap, kickoffs],
  );

  // --- páginas (sin filtros activos) ---
  const grupoList = (g: string) =>
    MATCHES.filter((m) => m.g === g).slice().sort(byKickoff);

  const dateRange = (list: Match[]): string => {
    if (!list.length) return "";
    const ds = list.map((m) => m.d).sort();
    const a = fmtDate(ds[0]);
    const b = fmtDate(ds[ds.length - 1]);
    return a === b ? a : `${a}–${b}`;
  };

  const onSave = (
    id: string,
    score: [number, number],
    pen?: "h" | "a" | null,
  ) => {
    setScore(id, score);
    // Definición por penales: se guarda aparte (pen:<id>) como [1,0]/[0,1].
    const pk = penKey(id);
    if (pen === "h") setScore(pk, [1, 0]);
    else if (pen === "a") setScore(pk, [0, 1]);
    else clearScore(pk);
    setEditId(null);
    toast("Resultado guardado");
  };
  const onClearScore = (id: string) => {
    clearScore(id);
    clearScore(penKey(id)); // borrar también la tanda de penales, si había
    setEditId(null);
    toast("Volvé al dato base");
  };

  const onSync = async () => {
    setSyncing(true);
    const out = await syncResults(MATCHES, eff, GROUPS);
    setSyncing(false);
    if (!out.ok) return toast("No pude conectarme; segui con carga manual");
    if (out.filled > 0) {
      applyPatch(out.patch);
      toast(`Se completaron ${out.filled} partido${out.filled === 1 ? "" : "s"}`);
    } else toast("No encontré resultados nuevos");
  };

  const onResetAll = () => {
    if (!window.confirm("¿Borrar todos los resultados que cargaste y volver a los datos del modelo?")) return;
    resetAll();
    toast("Todo reiniciado");
  };

  const renderList = (list: Match[]) =>
    mode === "dense" ? (
      <div className="mrows">
        {list.map((m) => (
          <MatchRow key={m.id} m={m} results={eff} liveMap={liveMap} ko={kickoffs[m.id]} onOpen={setEditId} />
        ))}
      </div>
    ) : (
      <div className="tickets">
        {list.map((m) => (
          <MatchCard key={m.id} m={m} results={eff} liveMap={liveMap} ko={kickoffs[m.id]} ratings={ratings} market={espn.markets[m.id]} onOpen={setEditId} />
        ))}
      </div>
    );

  // --- contenido principal ---
  let content;
  if (view === "bracket") {
    content = <Bracket groups={GROUPS} matches={MATCHES} results={eff} />;
  } else if (active) {
    content = (
      <section>
        <div className="sectionhead">
          <span className="bar3" />
          <h2>Resultados</h2>
          <span className="ss">{filtered.length} partidos</span>
        </div>
        {filtered.length ? (
          renderList(filtered)
        ) : (
          <div className="empty">
            <div className="big">Sin partidos</div>
            <p>Ningún partido coincide con los filtros.</p>
            <button type="button" className="btn primary" onClick={onClear}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>
    );
  } else if (view === "fecha") {
    const prev: Match[] = [];
    const today: Match[] = [];
    const next: Match[] = [];
    for (const m of allMatches) {
      const b = timeBucket(m);
      (b === "prev" ? prev : b === "next" ? next : today).push(m);
    }
    prev.sort((a, b) => byKickoff(b, a)); // anteriores: más reciente primero
    today.sort(byKickoff);
    next.sort(byKickoff);
    const list = timeTab === "prev" ? prev : timeTab === "next" ? next : today;
    const emptyMsg =
      timeTab === "today"
        ? "No hay partidos hoy. Mirá Próximos o Anteriores."
        : timeTab === "next"
          ? "No quedan próximos partidos."
          : "Todavía no hay partidos jugados.";
    content = (
      <>
        <div className="timetabs" role="tablist" aria-label="Partidos por momento">
          <button type="button" role="tab" aria-selected={timeTab === "prev"} onClick={() => setTimeTab("prev")}>
            Anteriores<span className="n">{prev.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={timeTab === "today"} onClick={() => setTimeTab("today")}>
            Hoy<span className="n">{today.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={timeTab === "next"} onClick={() => setTimeTab("next")}>
            Próximos<span className="n">{next.length}</span>
          </button>
        </div>
        {list.length ? (
          renderList(list)
        ) : (
          <div className="empty">
            <div className="big">Sin partidos</div>
            <p>{emptyMsg}</p>
          </div>
        )}
      </>
    );
  } else {
    const idx = page.grupo;
    const g = GRUPOS[idx];
    const list = grupoList(g);
    const info: PageInfo = {
      label: "Zona",
      big: "Grupo",
      em: g,
      meta: `${playedCount(list, eff)} de ${list.length} jugados · ${dateRange(list)}`,
    };
    content = (
      <>
        <Pager pages={GRUPOS.length} index={idx} onIndex={(i) => setPage((p) => ({ ...p, grupo: i }))} info={info} />
        <Standings group={g} groups={GROUPS} matches={MATCHES} results={eff} />
        {renderList(list)}
      </>
    );
  }

  return (
    <>
      <Header stats={stats} liveCount={liveCount} />
      {liveItems.length > 0 && (
        <div className="wrap">
          <LiveNow items={liveItems} onOpen={setEditId} />
        </div>
      )}
      <TopBar view={view} onView={setView} mode={mode} onMode={setMode} />

      <main>
        <div className="wrap">
          {view !== "bracket" && (
            <FilterBar
              filters={filters}
              counts={counts}
              confeds={CONFEDS}
              active={active}
              onStatus={onStatus}
              onConf={onConf}
              onConfed={onConfed}
              onQuery={onQuery}
              onClear={onClear}
            />
          )}
          <div id="contenido">{content}</div>
        </div>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="legend">
            <span>🎯 <b>Exacto</b>: marcador clavado</span>
            <span>✅ <b>Ganador</b>: G/E/P</span>
            <span>❌ <b>Fallado</b></span>
            <span>⏳ <b>Pendiente</b></span>
            <span><b>verde</b> clasifican · <b>ámbar</b> mejor 3º</span>
          </div>
          <div className="foot-actions">
            <button type="button" className="btn" disabled={syncing} onClick={onSync}>
              {syncing ? "Buscando…" : "Buscar resultados (beta)"}
            </button>
            <button type="button" className="btn ghost" onClick={onResetAll}>
              Reiniciar todo
            </button>
          </div>
          <p className="meta">
            Datos al {fmtDate(UPDATED)} · predicciones modelo Montecarlo · resultados
            en vivo vía{" "}
            <a href="https://www.thesportsdb.com" target="_blank" rel="noopener">
              TheSportsDB
            </a>
. Fecha y hora reales de la API, en tu hora local (los partidos sin cobertura todavía muestran solo la fecha). Tocá un partido para ver el detalle o cargar su resultado.
          </p>
          <p className="credit">
            Desarrollado por{" "}
            <a href="https://www.instagram.com/istincho_/" target="_blank" rel="noopener">
              @istincho_
            </a>
          </p>
        </div>
      </footer>

      <Editor
        match={editMatch}
        results={eff}
        userLoaded={editMatch ? hasUser(editMatch, results) : false}
        eventId={editMatch ? eventIds[editMatch.id] ?? null : null}
        afFid={editMatch ? afFids[editMatch.id] ?? null : null}
        espnEid={editMatch ? espn.eventIds[editMatch.id] ?? null : null}
        espnFlip={editMatch ? !!espn.flips[editMatch.id] : false}
        pred={editMatch ? predict(editMatch, ratings) : null}
        ko={editMatch ? kickoffs[editMatch.id] ?? "" : ""}
        live={editMatch ? isLive(editMatch, eff, liveMap) : false}
        onSave={onSave}
        onClear={onClearScore}
        onClose={() => setEditId(null)}
      />

      {toastNode}
    </>
  );
}
