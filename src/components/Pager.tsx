export interface PageInfo {
  label: string;   // "Jornada" | "Grupo"
  big: string;     // "Fecha" | "Grupo"
  em: string;      // "01" | "A"
  meta: string;    // "15 de 24 jugados · 11–17 jun"
}

export function Pager({
  pages,
  index,
  onIndex,
  info,
}: {
  pages: number;
  index: number;
  onIndex: (i: number) => void;
  info: PageInfo;
}) {
  return (
    <>
      <div className="pager">
        <button
          type="button"
          className="nav"
          aria-label="Anterior"
          disabled={index === 0}
          onClick={() => onIndex(index - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="center">
          <div className="lbl">{info.label}</div>
          <div className="big">
            {info.big} <em>{info.em}</em>
          </div>
          <div className="meta">{info.meta}</div>
        </div>

        <button
          type="button"
          className="nav"
          aria-label="Siguiente"
          disabled={index === pages - 1}
          onClick={() => onIndex(index + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="dots">
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === index}
            aria-label={`Ir a ${info.big} ${i + 1}`}
            onClick={() => onIndex(i)}
          />
        ))}
      </div>
    </>
  );
}
