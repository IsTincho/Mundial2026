import type { Filters, StatusFilter } from "../types";
import type { StatusCounts } from "../lib/filters";

const STATUS: { key: StatusFilter; label: string; swatch?: string }[] = [
  { key: "all", label: "Todos" },
  { key: "live", label: "En vivo", swatch: "var(--live)" },
  { key: "pending", label: "Pendientes" },
  { key: "exact", label: "Exactos", swatch: "var(--gold)" },
  { key: "winner", label: "Ganados", swatch: "var(--hit)" },
  { key: "miss", label: "Fallados", swatch: "var(--miss)" },
];

export function FilterBar({
  filters,
  counts,
  confeds,
  active,
  onStatus,
  onConf,
  onConfed,
  onQuery,
  onClear,
}: {
  filters: Filters;
  counts: StatusCounts;
  confeds: readonly string[];
  active: boolean;
  onStatus: (s: StatusFilter) => void;
  onConf: () => void;
  onConfed: (c: string) => void;
  onQuery: (q: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="filters" aria-label="Filtros">
      <div className="chips">
        {STATUS.map((s) => (
          <button
            key={s.key}
            type="button"
            className="chip"
            aria-pressed={filters.status === s.key}
            onClick={() => onStatus(s.key)}
          >
            {s.swatch && <span className="swatch" style={{ background: s.swatch }} />}
            {s.label}
            <span className="n">{counts[s.key]}</span>
          </button>
        ))}

        <button
          type="button"
          className="chip"
          aria-pressed={filters.conf === "low"}
          onClick={onConf}
          title="Candidatos a empate (confianza menor a 6)"
        >
          Conf · empate &lt;6
        </button>

        {confeds.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={filters.confed === c}
            onClick={() => onConfed(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="filter-row2">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={filters.query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar equipo o grupo… (Argentina, Grupo H)"
            aria-label="Buscar equipo o grupo"
          />
          {filters.query && (
            <button type="button" className="clr" aria-label="Limpiar búsqueda" onClick={() => onQuery("")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        {active && (
          <button type="button" className="clearfilters" onClick={onClear}>
            Limpiar
          </button>
        )}
      </div>
    </section>
  );
}
