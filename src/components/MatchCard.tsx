import type { Match, Results } from "../types";
import { teamMeta } from "../data";
import { effResult, fmtDate, isLive, verdict } from "../lib/logic";
import { VerdictTag } from "./Score";

export function MatchCard({
  m,
  results,
  onOpen,
}: {
  m: Match;
  results: Results;
  onOpen: (id: string) => void;
}) {
  const r = effResult(m, results);
  const live = isLive(m, results);
  const vd = verdict(m, results);
  const conf = typeof m.c === "number" ? m.c : 0;
  const pct = Math.max(0, Math.min(100, conf * 10));
  const lowConf = conf < 6;

  return (
    <button
      type="button"
      className={"card v-" + vd}
      onClick={() => onOpen(m.id)}
      aria-label={`${m.h} contra ${m.a}, grupo ${m.g}, fecha ${m.f}. Tocá para cargar el resultado.`}
    >
      <div className="crow">
        <div className="tags">
          <span className="tag g">Grupo {m.g}</span>
          <span className="tag">Fecha {m.f}</span>
          <span className="tag">{fmtDate(m.d)}</span>
        </div>
        <VerdictTag v={vd} />
      </div>

      <div className="match">
        <div className="team home">
          <span className="nm">{m.h}</span>
          <span className="cf">{teamMeta(m.h)}</span>
        </div>
        <div className="board">
          <div className="scores">
            <div className="scell pred">
              <div className="lab">Prode</div>
              <div className="num">
                {m.p[0]}:{m.p[1]}
              </div>
            </div>
            {live ? (
              <div className="scell live">
                <div className="lab">Real</div>
                <div className="num">EN JUEGO</div>
              </div>
            ) : (
              <div className="scell real">
                <div className="lab">Real</div>
                <div className={"num" + (r ? "" : " pend")}>
                  {r ? `${r[0]}:${r[1]}` : "–:–"}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="team away">
          <span className="nm">{m.a}</span>
          <span className="cf">{teamMeta(m.a)}</span>
        </div>
      </div>

      <div className="conf">
        <span className="cl">Conf</span>
        <span className="track">
          <span className="fill" style={{ width: pct + "%" }} />
        </span>
        <span className="cv">{conf.toFixed(1)}</span>
        {lowConf && <span className="hintlow">↓ candidato a empate</span>}
      </div>
    </button>
  );
}
