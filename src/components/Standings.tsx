import type { Match, Results, Team } from "../types";
import { standings } from "../lib/logic";

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
    <div className="standings">
      <div className="st-head">
        <span className="r">#</span>
        <span>Equipo · PJ · G-E-P · GF:GC</span>
        <span className="r">DG</span>
        <span className="r">Pts</span>
      </div>
      {rows.map((t, i) => {
        const cls = i < 2 ? "q" : i === 2 ? "third" : "out";
        const dg = (t.dg > 0 ? "+" : "") + t.dg;
        const rec = `${t.pj} PJ · ${t.g}-${t.e}-${t.p} · ${t.gf}:${t.gc}`;
        return (
          <div className={"st-row " + cls} key={t.name}>
            <span className="st-pos">{i + 1}</span>
            <div className="st-team">
              <span className="st-name">{t.name}</span>
              <span className="st-rec">{rec}</span>
            </div>
            <span className="st-dg">{dg}</span>
            <span className="st-pts">{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
}
