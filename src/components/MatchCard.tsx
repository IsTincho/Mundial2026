import type { LiveMap, Match, Results } from "../types";
import { teamMeta } from "../data";
import { effResult, fmtDate, isLive, localDate, localTime, verdict } from "../lib/logic";
import { predict, blend, pct, type Ratings } from "../lib/model";
import type { Market } from "../lib/espn";
import { VerdictTag } from "./Score";
import { Flag, VsCrest } from "./Flag";

export function MatchCard({
  m,
  results,
  liveMap,
  ko,
  ratings,
  market,
  onOpen,
}: {
  m: Match;
  results: Results;
  liveMap: LiveMap;
  ko?: string;
  ratings: Ratings;
  market?: Market;
  onOpen: (id: string) => void;
}) {
  const when = ko ? `${localDate(ko)} · ${localTime(ko)}` : fmtDate(m.d);
  const r = effResult(m, results);
  const live = isLive(m, results, liveMap);
  const liveScore = live ? liveMap[m.id] : null;
  const vd = verdict(m, results, liveMap);
  const decided = !!r || live;
  // Predicción = modelo mezclado con el mercado (cuotas mandan cuando hay).
  const pr = blend(predict(m, ratings), market);
  // Pendiente → predicción re-analizada por el modelo (forma actual).
  // Jugado/en vivo → la predicción original (coherente con el veredicto).
  const predScore = decided ? m.p : pr.score;
  const conf = decided ? (typeof m.c === "number" ? m.c : 0) : pr.conf;
  const confPct = Math.max(0, Math.min(100, conf * 10));
  const lowConf = conf < 6;
  const serial = String(m.n).padStart(3, "0");
  const ph = pct(pr.pHome);
  const pd = pct(pr.pDraw);
  const pa = pct(pr.pAway);

  return (
    <button
      type="button"
      className={"card v-" + vd}
      onClick={() => onOpen(m.id)}
      aria-label={`${m.h} contra ${m.a}, grupo ${m.g}, fecha ${m.f}. Tocá para cargar el resultado.`}
    >
      <div className="crow">
        <VsCrest home={m.h} away={m.a} />
        <div className="serial">
          <span className="no">№ {serial}</span>
          <span className="dotrow" aria-hidden="true" />
          <span className="code">
            GRP {m.g} · {when}
          </span>
        </div>
        <span className="stampbox">
          <VerdictTag v={vd} />
        </span>
      </div>

      <div className="perf" aria-hidden="true">
        <span className="notch l" />
        <span className="notch r" />
      </div>

      <div className="match">
        <div className="team home">
          <div className="teamline">
            <Flag team={m.h} size="lg" />
            <span className="nm">{m.h}</span>
          </div>
          <span className="cf">{teamMeta(m.h)}</span>
        </div>
        <div className="board">
          <div className="scores">
            <div className="scell pred">
              <div className="lab">Prode</div>
              <div className="num flip">
                {predScore[0]}:{predScore[1]}
              </div>
            </div>
            {live ? (
              <div className="scell live">
                <div className="lab">
                  <span className="livedot" /> En vivo
                </div>
                <div className={"num" + (liveScore ? " livescore" : " waiting")}>
                  {liveScore ? `${liveScore[0]}:${liveScore[1]}` : "···"}
                </div>
              </div>
            ) : (
              <div className="scell real">
                <div className="lab">Real</div>
                <div className={"num flip" + (r ? "" : " pend")}>
                  {r ? `${r[0]}:${r[1]}` : "–:–"}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="team away">
          <div className="teamline">
            <Flag team={m.a} size="lg" />
            <span className="nm">{m.a}</span>
          </div>
          <span className="cf">{teamMeta(m.a)}</span>
        </div>
      </div>

      <div className="probs">
        <div className="pbar" aria-hidden="true">
          <span className="ph" style={{ width: ph + "%" }} />
          <span className="pd" style={{ width: pd + "%" }} />
          <span className="pa" style={{ width: pa + "%" }} />
        </div>
        <div className="plabs">
          <span className="pl"><b>{ph}%</b> {m.h}</span>
          <span className="pm">Empate <b>{pd}%</b></span>
          <span className="pr">{m.a} <b>{pa}%</b></span>
        </div>
        <div className="pxg">xG {pr.xgHome.toFixed(1)} – {pr.xgAway.toFixed(1)}</div>
      </div>

      <div className="conf">
        <span className="cl">Conf</span>
        <span className="track">
          <span className="fill" style={{ width: confPct + "%" }} />
          <span className="ticks" aria-hidden="true" />
        </span>
        <span className="cv">{conf.toFixed(1)}</span>
        {lowConf && <span className="hintlow">¿empate?</span>}
      </div>
    </button>
  );
}
