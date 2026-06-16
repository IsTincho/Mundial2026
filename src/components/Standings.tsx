import type { Match, Results, Team } from "../types";
import { standings } from "../lib/logic";
import { Flag } from "./Flag";

export function Standings({
  group,
  groups,
  matches,
  results,
}: {
  group: string;
  groups: Record<string, Team[]>;
  matches: Match[];
  results: Results;
}) {
  const rows = standings(group, groups, matches, results);
  return (
    <div className="table">
      <div className="th">
        <span className="r">#</span>
        <span>Equipo · PJ · G-E-P</span>
        <span className="r">GF:GC</span>
        <span className="r">DG</span>
        <span className="r">Pts</span>
      </div>
      {rows.map((t, i) => {
        const cls = i < 2 ? "q" : i === 2 ? "third" : "out";
        const dg = (t.dg > 0 ? "+" : t.dg < 0 ? "−" : "") + Math.abs(t.dg);
        return (
          <div className={"tr " + cls} key={t.name}>
            <span className="pos">{i + 1}</span>
            <div className="tm">
              <span className="nm">
                <Flag team={t.name} size="sm" />
                {t.name}
              </span>
              <span className="rec">
                {t.pj} PJ · {t.g}-{t.e}-{t.p}
              </span>
            </div>
            <span className="num">
              {t.gf}:{t.gc}
            </span>
            <span className="num">{dg}</span>
            <span className="pts">{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
}
