import { useMemo, useState } from "react";
import type { Match, View } from "./types";
import { GROUPS, MATCHES, UPDATED } from "./data";
import { byDateThenGroup, fmtDate, playedCount, tracker } from "./lib/logic";
import { syncResults } from "./lib/sync";
import { useResults } from "./hooks/useResults";
import { Header } from "./components/Header";
import { ViewToggle } from "./components/ViewToggle";
import { Ticket } from "./components/Ticket";
import { Standings } from "./components/Standings";
import { Editor } from "./components/Editor";
import { useToast } from "./components/Toast";

export default function App() {
  const { results, setScore, clearScore, applyPatch, resetAll } = useResults();
  const [view, setView] = useState<View>("fecha");
  const [editId, setEditId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast, node: toastNode } = useToast();

  const stats = useMemo(() => tracker(MATCHES, results), [results]);
  const editMatch = useMemo(
    () => MATCHES.find((m) => m.id === editId) ?? null,
    [editId],
  );

  const sections = useMemo(() => {
    if (view === "grupo") {
      return Object.keys(GROUPS).map((g) => ({
        key: g,
        title: "Grupo " + g,
        group: g,
        list: MATCHES.filter((m) => m.g === g)
          .slice()
          .sort((a, b) => a.f - b.f || byDateThenGroup(a, b)),
      }));
    }
    return ([1, 2, 3] as const).map((f) => ({
      key: "f" + f,
      title: "Fecha " + f,
      group: null as string | null,
      list: MATCHES.filter((m) => m.f === f).slice().sort(byDateThenGroup),
    }));
  }, [view]);

  const onSave = (id: string, score: [number, number]) => {
    setScore(id, score);
    setEditId(null);
    toast("Resultado guardado");
  };
  const onClear = (id: string) => {
    clearScore(id);
    setEditId(null);
    toast("Volvé al dato base del partido");
  };

  const onSync = async () => {
    setSyncing(true);
    const out = await syncResults(MATCHES, results, GROUPS);
    setSyncing(false);
    if (!out.ok) {
      toast("No pude conectarme a la API; segui con la carga manual");
      return;
    }
    if (out.filled > 0) {
      applyPatch(out.patch);
      toast(
        "Se completaron " +
          out.filled +
          (out.filled === 1 ? " partido" : " partidos"),
      );
    } else {
      toast("No encontré resultados nuevos");
    }
  };

  const onResetAll = () => {
    const ok = window.confirm(
      "¿Borrar todos los resultados que cargaste y volver a los datos del modelo?",
    );
    if (!ok) return;
    resetAll();
    toast("Todo reiniciado");
  };

  return (
    <>
      <Header stats={stats} />
      <ViewToggle view={view} onChange={setView} />

      <main>
        <div className="wrap">
          <div id="contenido">
            {sections.map((sec) => (
              <section key={sec.key}>
                <div className="sec-h">
                  <span className="tick" />
                  <h2>{sec.title}</h2>
                  <span className="sec-sub">
                    {playedCount(sec.list, results)} de {sec.list.length} jugados
                  </span>
                </div>
                {sec.group && (
                  <Standings
                    group={sec.group}
                    groups={GROUPS}
                    matches={MATCHES}
                    results={results}
                  />
                )}
                <div className="tickets">
                  {sec.list.map((m: Match) => (
                    <Ticket
                      key={m.id}
                      m={m}
                      results={results}
                      onOpen={setEditId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="legend">
            <span>🎯 <b>Exacto</b>: marcador clavado</span>
            <span>✅ <b>Ganador</b>: acerté G/E/P</span>
            <span>❌ <b>Fallado</b></span>
            <span>⏳ <b>Pendiente</b></span>
            <span>🔴 <b>En vivo</b></span>
            <span>
              Tabla: <b>verde</b> clasifican (1º–2º) · <b>ámbar</b> mejor tercero (3º)
            </span>
          </div>

          <div className="foot-actions">
            <button
              type="button"
              className="btn"
              disabled={syncing}
              onClick={onSync}
            >
              {syncing ? "Buscando…" : "Buscar resultados (beta)"}
            </button>
            <button type="button" className="btn ghost" onClick={onResetAll}>
              Reiniciar todo
            </button>
          </div>

          <p className="meta">
            Datos al {fmtDate(UPDATED)} · Predicciones: modelo Montecarlo.
            <br />
            Tocá un partido para cargar o editar su resultado real. Resultados en
            vivo (beta) vía{" "}
            <a href="https://www.thesportsdb.com" target="_blank" rel="noopener">
              TheSportsDB
            </a>
            .
          </p>
        </div>
      </footer>

      <Editor
        match={editMatch}
        results={results}
        onSave={onSave}
        onClear={onClear}
        onClose={() => setEditId(null)}
      />

      {toastNode}
    </>
  );
}
