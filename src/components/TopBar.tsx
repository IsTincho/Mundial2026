import type { View, ViewMode } from "../types";

const VIEWS: { key: View; label: string }[] = [
  { key: "fecha", label: "Partidos" },
  { key: "grupo", label: "Por grupo" },
  { key: "bracket", label: "Fase final" },
];

export function TopBar({
  view,
  onView,
  mode,
  onMode,
}: {
  view: View;
  onView: (v: View) => void;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
}) {
  return (
    <nav className="bar" aria-label="Vista del fixture">
      <div className="wrap">
        <div className="seg" role="group" aria-label="Vista">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              onClick={() => onView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view !== "bracket" && (
          <div className="viewmode" role="group" aria-label="Densidad">
            <button
              type="button"
              aria-pressed={mode === "cards"}
              aria-label="Vista de tarjetas"
              title="Tarjetas"
              onClick={() => onMode("cards")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="7" rx="1.5" />
                <rect x="3" y="14" width="18" height="6" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={mode === "dense"}
              aria-label="Vista de lista densa"
              title="Lista densa"
              onClick={() => onMode("dense")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
