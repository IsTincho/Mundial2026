import { useMemo } from "react";
import type { BracketTie, Match, Qualifier, Results, Team } from "../types";
import { buildBracket, qualifiers, thirdsTable } from "../lib/bracket";
import { Flag } from "./Flag";

function TeamSlot({ q, adv }: { q: Qualifier | null; adv: boolean }) {
  if (!q) {
    return (
      <div className="bteam tbd">
        <span className="sd">–</span>
        <span className="nm">A definir</span>
        <span className="gp" />
      </div>
    );
  }
  return (
    <div className={"bteam" + (adv ? " adv" : "")}>
      <span className="sd">{q.seed}</span>
      <Flag team={q.name} size="sm" />
      <span className="nm">{q.name}</span>
      <span className="gp">
        {q.pos}
        {q.group}
      </span>
    </div>
  );
}

function Tie({ tie }: { tie: BracketTie }) {
  const a = tie.a;
  const b = tie.b;
  const aAdv = !!a && (!b || a.seed <= b.seed);
  const bAdv = !!b && (!a || b.seed < a.seed);
  return (
    <div className="btie">
      <TeamSlot q={a} adv={aAdv} />
      <TeamSlot q={b} adv={bAdv} />
    </div>
  );
}

export function Bracket({
  groups,
  matches,
  results,
}: {
  groups: Record<string, Team[]>;
  matches: Match[];
  results: Results;
}) {
  const quals = useMemo(
    () => qualifiers(groups, matches, results),
    [groups, matches, results],
  );
  const rounds = useMemo(() => buildBracket(quals), [quals]);
  const thirds = useMemo(
    () => thirdsTable(groups, matches, results),
    [groups, matches, results],
  );

  return (
    <section>
      <div className="sectionhead">
        <span className="bar3" />
        <h2>Fase final</h2>
        <span className="ss">proyección en vivo</span>
      </div>
      <p className="bracket-intro">
        Bracket de 32 proyectado desde la <b>tabla en vivo</b>: 1º y 2º de cada grupo
        más los <b>8 mejores terceros</b>, sembrados por campaña (Pts → DG → GF). En
        cada cruce avanza el de mejor siembra. Es una proyección — se recalcula a
        medida que cargás resultados, no son predicciones de marcador.
      </p>

      <div className="bracket-scroll">
        <div className="bracket">
          {rounds.map((round) => (
            <div className="bcol" key={round.name}>
              <div className="rname">{round.name}</div>
              <div className="bties">
                {round.ties.map((tie, i) => (
                  <Tie tie={tie} key={round.name + i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sectionhead">
        <span className="bar3" />
        <h2>Mejores terceros</h2>
        <span className="ss">clasifican 8 de 12</span>
      </div>
      <div className="table thirds">
        <div className="th">
          <span className="r">#</span>
          <span>Equipo · Grupo</span>
          <span className="r">GF</span>
          <span className="r">DG</span>
          <span className="r">Pts</span>
        </div>
        {thirds.map((t) => (
          <div className={"tr " + (t.qualifies ? "q" : "out")} key={t.group}>
            <span className="pos">{t.rank}</span>
            <div className="tm">
              <span className="nm">
                <Flag team={t.name} size="sm" />
                {t.name}
              </span>
              <span className="rec">Grupo {t.group}</span>
            </div>
            <span className="num">{t.gf}</span>
            <span className="num">
              {(t.dg > 0 ? "+" : t.dg < 0 ? "−" : "") + Math.abs(t.dg)}
            </span>
            <span className="pts">{t.pts}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
