import { useEffect, useRef, useState } from "react";
import type { Match, Results, Score } from "../types";
import { effResult, fmtDate, localDateTime } from "../lib/logic";
import { MatchDetailPanel } from "./MatchDetailPanel";
import { Flag } from "./Flag";
import type { Prediction } from "../lib/model";

function parseScore(hs: string, as: string): Score | null {
  const h = hs.trim();
  const a = as.trim();
  if (h === "" || a === "") return null;
  if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(a)) return null;
  const hn = parseInt(h, 10);
  const an = parseInt(a, 10);
  if (hn < 0 || an < 0 || hn > 99 || an > 99) return null;
  return [hn, an];
}

export function Editor({
  match,
  results,
  userLoaded,
  eventId,
  afFid,
  espnEid,
  espnFlip,
  pred,
  ko,
  live,
  onSave,
  onClear,
  onClose,
}: {
  match: Match | null;
  results: Results;
  userLoaded: boolean;
  eventId: string | null;
  afFid: number | null;
  espnEid: string | null;
  espnFlip: boolean;
  pred: Prediction | null;
  ko: string;
  live: boolean;
  onSave: (id: string, score: Score) => void;
  onClear: (id: string) => void;
  onClose: () => void;
}) {
  const dlgRef = useRef<HTMLDialogElement>(null);
  const homeRef = useRef<HTMLInputElement>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [hint, setHint] = useState("");

  // Abrir/cerrar el <dialog> nativo según haya partido seleccionado.
  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (match) {
      const r = effResult(match, results);
      setHome(r ? String(r[0]) : "");
      setAway(r ? String(r[1]) : "");
      setHint("");
      if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
      else dlg.setAttribute("open", "");
      const t = setTimeout(() => {
        homeRef.current?.focus();
        homeRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
    if (typeof dlg.close === "function" && dlg.open) dlg.close();
    else dlg.removeAttribute("open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  if (!match) {
    return <dialog ref={dlgRef} aria-labelledby="ed-title" />;
  }

  const isUser = userLoaded;
  const hasSeed = match.r != null;
  const resetMode: "clear" | "restore" | "none" = isUser
    ? "clear"
    : hasSeed
      ? "restore"
      : "none";
  const resetLabel =
    resetMode === "clear"
      ? "Borrar mi carga"
      : resetMode === "restore"
        ? "Restaurar dato del modelo"
        : "Sin dato cargado";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = parseScore(home, away);
    if (!sc) {
      setHint("Ingresá dos números válidos (0 o más) para guardar.");
      return;
    }
    onSave(match.id, sc);
  };

  const onReset = () => {
    if (resetMode === "clear") {
      onClear(match.id);
    } else if (resetMode === "restore" && match.r) {
      setHome(String(match.r[0]));
      setAway(String(match.r[1]));
      setHint("");
    }
  };

  return (
    <dialog
      ref={dlgRef}
      id="editor"
      aria-labelledby="ed-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form id="ed-form" onSubmit={submit}>
        <h2 id="ed-title" className="sr-only">
          {match.h} vs {match.a}
        </h2>
        <div className="ed-head">
          <div className="ed-ht">
            <Flag team={match.h} size="lg" />
            <span className="nm">{match.h}</span>
          </div>
          <span className="ed-vs">VS</span>
          <div className="ed-ht">
            <Flag team={match.a} size="lg" />
            <span className="nm">{match.a}</span>
          </div>
        </div>
        <p className="ed-sub">
          Grupo {match.g} · Fecha {match.f} · {ko ? localDateTime(ko) : fmtDate(match.d)}
        </p>

        <div className="ed-grid">
          <label className="ed-team">
            <span>{match.h}</span>
            <input
              ref={homeRef}
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              placeholder="–"
              aria-label="Goles del local"
              value={home}
              onChange={(e) => {
                setHome(e.target.value);
                setHint("");
              }}
            />
          </label>
          <span className="ed-dash">:</span>
          <label className="ed-team">
            <span>{match.a}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              step={1}
              placeholder="–"
              aria-label="Goles de la visita"
              value={away}
              onChange={(e) => {
                setAway(e.target.value);
                setHint("");
              }}
            />
          </label>
        </div>

        <p className="ed-pred">
          Tu pronóstico:{" "}
          <b>
            {match.p[0]}:{match.p[1]}
          </b>
        </p>
        <p className="ed-hint" role="alert" aria-live="polite">
          {hint}
        </p>

        <div className="ed-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={resetMode === "none"}
            onClick={onReset}
          >
            {resetLabel}
          </button>
          <div className="ed-actions-right">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Guardar
            </button>
          </div>
        </div>
      </form>

      {(eventId || afFid || espnEid) && (
        <MatchDetailPanel
          eventId={eventId}
          afFid={afFid}
          espnEid={espnEid}
          espnFlip={espnFlip}
          home={match?.h}
          away={match?.a}
          pred={pred}
          live={live}
        />
      )}
    </dialog>
  );
}
