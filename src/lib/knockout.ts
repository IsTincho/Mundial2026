// Fixture de la fase final como partidos "de verdad" (aparecen en Hoy/Próximos,
// igual que los de grupos). Los equipos son una PROYECCIÓN: salen del bracket
// armado desde la tabla en vivo (cuadro oficial FIFA 2026), así que se
// recalculan a medida que cargás resultados. El pronóstico de marcador lo genera
// el mismo modelo que en grupos. La fecha es la oficial (fallback); ESPN refina
// hora y sede en vivo.
import type { Match, Results, Team } from "../types";
import { buildBracket } from "./bracket";
import { predict, type Ratings } from "./model";

// Fecha oficial (YYYY-MM-DD) por número de partido. Es el fallback para ubicar
// el partido en Hoy/Próximos/Anteriores; la hora exacta la pone ESPN en vivo.
const KO_DATE: Record<number, string> = {
  73: "2026-06-28",
  74: "2026-06-29", 75: "2026-06-29", 76: "2026-06-29",
  77: "2026-06-30", 78: "2026-06-30", 79: "2026-06-30",
  80: "2026-07-01", 81: "2026-07-01", 82: "2026-07-01",
  83: "2026-07-02", 84: "2026-07-02", 85: "2026-07-02",
  86: "2026-07-03", 87: "2026-07-03", 88: "2026-07-03",
  89: "2026-07-04", 90: "2026-07-04", 91: "2026-07-05", 92: "2026-07-05",
  93: "2026-07-06", 94: "2026-07-06", 95: "2026-07-07", 96: "2026-07-07",
  97: "2026-07-09", 98: "2026-07-10", 99: "2026-07-11", 100: "2026-07-11",
  101: "2026-07-14", 102: "2026-07-15",
  104: "2026-07-19",
};

const TBD = "A definir";

// Genera los 32 partidos de eliminatorias proyectados, con pronóstico del modelo.
export function buildKnockout(
  groups: Record<string, Team[]>,
  matches: Match[],
  results: Results,
  ratings: Ratings,
): Match[] {
  // "auto": los cruces ya jugados avanzan al ganador real (incl. penales); los
  // que faltan se proyectan con el modelo. Así los "Próximos" se actualizan y un
  // equipo eliminado deja de aparecer en las rondas siguientes.
  const rounds = buildBracket(groups, matches, results, "auto");
  const out: Match[] = [];

  for (const r of rounds) {
    for (const tie of r.ties) {
      const h = tie.a?.name ?? TBD;
      const a = tie.b?.name ?? TBD;
      const known = h !== TBD && a !== TBD;

      // Pronóstico del modelo solo si ambos equipos están definidos.
      let p: [number, number] = [0, 0];
      let c = 0;
      if (known) {
        const pr = predict({ h, a } as unknown as Match, ratings);
        p = pr.score;
        c = pr.conf;
      }

      out.push({
        g: "KO",
        f: 0,
        d: KO_DATE[tie.n] ?? "2026-07-19",
        h,
        a,
        p,
        c,
        r: null,
        id: `KO-${tie.n}`,
        n: tie.n,
        round: r.name,
        proj: true,
      });
    }
  }

  return out;
}
