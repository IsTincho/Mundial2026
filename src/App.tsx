import { useMemo, useState } from "react";
import type {
  ConfFilter,
  Filters,
  Match,
  StatusFilter,
  View,
  ViewMode,
} from "./types";
import { CONFEDS, GROUPS, MATCHES, UPDATED } from "./data";
import {
  byDateThenGroup,
  fmtDate,
  hasUser,
  isLive,
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
import { useResults } from "./hooks/useResults";
import { useLive } from "./hooks/useLive";
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
import { useToast } from "./components/Toast";

const FECHAS = [1, 2, 3] as const;
const GRUPOS = Object.keys(GROUPS);

export default function App() {
  const { results, setScore, clearScore, applyPatch, resetAll } = useResults();
  const { live: liveMap, finals } = useLive(MATCHES, GROUPS);
  // Resultados efectivos: tus cargas pisan los finales de la API; ambos pisan
  // la semilla (manejada dentro de effResult). Los finales NO se persisten.
  const eff = useMemo(() => ({ ...finals, ...results }), [finals, results]);
  const [view, setView] = useState<View>("fecha");
  const [mode, setMode] = useState<ViewMode>("cards");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState<{ fecha: number; grupo: number }>({ fecha: 0, grupo: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast, node: toastNode } = useToast();

  const stats = useMemo(() => tracker(MATCHES, eff), [eff]);
  const liveCount = useMemo(
    () => MATCHES.filter((m) => isLive(m, eff, liveMap)).length,
    [eff, liveMap],
  );
  const counts = useMemo(() => statusCounts(MATCHES, eff, liveMap), [eff, liveMap]);
  const active = filtersActive(filters);
  const editMatch = useMemo(
    () => MATCHES.find((m) => m.id === editId) ?? null,
    [editId],
  );

  // --- helpers de filtros ---
  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const onStatus = (s: StatusFilter) => patch({ status: filters.status === s ? "all" : s });
  const onConf = () => patch({ conf: (filters.conf === "low" ? "all" : "low") as ConfFilter });
  const onConfed = (c: string) => patch({ confed: filters.confed === c ? null : c });
  const onQuery = (q: string) => patch({ query: q });
  const onClear = () => setFilters(EMPTY_FILTERS);

  // --- resultados de filtro (modo plano, sin paginación) ---
  const filtered = useMemo(
    () => filterMatches(MATCHES, eff, filters, liveMap).slice().sort(byDateThenGroup),
    [eff, filters, liveMap],
  );

  // --- páginas (sin filtros activos) ---
  const fechaList = (f: number) =>
    MATCHES.filter((m) => m.f === f).slice().sort(byDateThenGroup);
  const grupoList = (g: string) =>
    MATCHES.filter((m) => m.g === g).slice().sort((a, b) => a.f - b.f || byDateThenGroup(a, b));

  const dateRange = (list: Match[]): string => {
    if (!list.length) return "";
    const ds = list.map((m) => m.d).sort();
    const a = fmtDate(ds[0]);
    const b = fmtDate(ds[ds.length - 1]);
    return a === b ? a : `${a}–${b}`;
  };

  const onSave = (id: string, score: [number, number]) => {
    setScore(id, score);
    setEditId(null);
    toast("Resultado guardado");
  };
  const onClearScore = (id: string) => {
    clearScore(id);
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
          <MatchRow key={m.id} m={m} results={eff} liveMap={liveMap} onOpen={setEditId} />
        ))}
      </div>
    ) : (
      <div className="tickets">
        {list.map((m) => (
          <MatchCard key={m.id} m={m} results={eff} liveMap={liveMap} onOpen={setEditId} />
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
    const idx = page.fecha;
    const f = FECHAS[idx];
    const list = fechaList(f);
    const info: PageInfo = {
      label: "Jornada",
      big: "Fecha",
      em: String(f).padStart(2, "0"),
      meta: `${playedCount(list, eff)} de ${list.length} jugados · ${dateRange(list)}`,
    };
    content = (
      <>
        <Pager pages={FECHAS.length} index={idx} onIndex={(i) => setPage((p) => ({ ...p, fecha: i }))} info={info} />
        {renderList(list)}
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
            . Tocá un partido para cargar o editar su resultado.
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
        onSave={onSave}
        onClear={onClearScore}
        onClose={() => setEditId(null)}
      />

      {toastNode}
    </>
  );
}
