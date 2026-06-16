import type { View } from "../types";

export function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav className="toggle" aria-label="Cambiar vista">
      <div className="wrap">
        <div className="seg" role="group" aria-label="Vista del fixture">
          <button
            type="button"
            aria-pressed={view === "fecha"}
            onClick={() => onChange("fecha")}
          >
            Por fecha
          </button>
          <button
            type="button"
            aria-pressed={view === "grupo"}
            onClick={() => onChange("grupo")}
          >
            Por grupo
          </button>
        </div>
      </div>
    </nav>
  );
}
