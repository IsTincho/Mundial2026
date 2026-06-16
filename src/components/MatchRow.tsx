import type { LiveMap, Match, Results } from "../types";
import { effResult, isLive, verdict } from "../lib/logic";

export function MatchRow({
  m,
  results,
  liveMap,
  onOpen,
}: {
  m: Match;
  results: Results;
  liveMap: LiveMap;
  onOpen: (id: string) => void;
}) {
  const r = effResult(m, results);
  const live = isLive(m, results, liveMap);
  const liveScore = live ? liveMap[m.id] : null;
  const vd = verdict(m, results, liveMap);

  return (
    <button
      type="button"
      className={"mrow v-" + vd}
      onClick={() => onOpen(m.id)}
      aria-label={`${m.h} contra ${m.a}, grupo ${m.g}. Tocá para cargar el resultado.`}
    >
      <span className="acc" />
      <span className="names">
        <span>{m.h}</span>
        <span className="vs">vs</span>
        <span>{m.a}</span>
      </span>
      <span className="gtag">{m.g}·F{m.f}</span>
      <span className="sc">
        <span className="p">
          {m.p[0]}:{m.p[1]}
        </span>
        <span className="sep">/</span>
        {live ? (
          <span className="r" style={{ color: "var(--live)" }}>
            {liveScore ? `${liveScore[0]}:${liveScore[1]}` : "LIVE"}
          </span>
        ) : (
          <span className={"r" + (r ? "" : " pend")}>
            {r ? `${r[0]}:${r[1]}` : "–:–"}
          </span>
        )}
      </span>
    </button>
  );
}
