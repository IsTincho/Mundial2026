// Modelo de predicción v2 (reproducible, sin datos externos).
// Mezcla DOS señales por equipo:
//   1) Prior por ranking FIFA (fuerza base).
//   2) Forma real: goles a favor / en contra en los partidos YA jugados.
// Se combinan con "shrinkage" (cuantos más partidos jugados, más pesa la forma).
// Con eso arma un Poisson bivariado → probabilidades 1X2, xG y marcador probable.
// Como usa los resultados efectivos, se RE-ANALIZA solo a medida que se juega.
import type { Match, Results, Team } from "../types";
import { GROUPS } from "../data";
import { effResult } from "./logic";

const RANK: Record<string, number> = {};
for (const g of Object.keys(GROUPS)) {
  for (const [name, rank] of GROUPS[g]) RANK[name] = rank;
}
const ALL_TEAMS = Object.keys(RANK);
const MEAN_STR =
  ALL_TEAMS.reduce((s, t) => s + -Math.log(RANK[t]), 0) / ALL_TEAMS.length;

// Parámetros
const MU = 1.3; // goles promedio por equipo por partido
const K = 0.5; // sensibilidad del prior a la fuerza
const SHRINK = 2.5; // cuántos "partidos virtuales" pesa el prior
const HOME_ADV = 1.08; // factor de localía (sedes mayormente neutrales)
const MAXG = 8;

function strength(rank: number): number {
  return -Math.log(rank);
}

export interface TeamRating {
  ef: number; // goles esperados a favor (forma + prior)
  ea: number; // goles esperados en contra
}
export type Ratings = Record<string, TeamRating>;

// Construye los ratings de todos los equipos a partir de los resultados ya
// jugados (effResult cubre semilla + cargas + API).
export function buildRatings(matches: Match[], results: Results): Ratings {
  const acc: Record<string, { gf: number; ga: number; n: number }> = {};
  const bump = (t: string, gf: number, ga: number) => {
    const a = (acc[t] ??= { gf: 0, ga: 0, n: 0 });
    a.gf += gf;
    a.ga += ga;
    a.n += 1;
  };
  for (const m of matches) {
    const r = effResult(m, results);
    if (!r) continue;
    bump(m.h, r[0], r[1]);
    bump(m.a, r[1], r[0]);
  }

  const ratings: Ratings = {};
  for (const t of ALL_TEAMS) {
    const str = strength(RANK[t]);
    const baseFor = MU * Math.exp(K * (str - MEAN_STR));
    const baseAgainst = MU * Math.exp(-K * (str - MEAN_STR));
    const a = acc[t];
    if (!a || a.n === 0) {
      ratings[t] = { ef: baseFor, ea: baseAgainst };
      continue;
    }
    const w = a.n / (a.n + SHRINK); // peso de la forma observada
    ratings[t] = {
      ef: (1 - w) * baseFor + w * (a.gf / a.n),
      ea: (1 - w) * baseAgainst + w * (a.ga / a.n),
    };
  }
  return ratings;
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}
function poisson(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}
function clamp(x: number): number {
  return Math.max(0.15, Math.min(5, x));
}

export interface Prediction {
  pHome: number;
  pDraw: number;
  pAway: number;
  xgHome: number;
  xgAway: number;
  score: [number, number];
  conf: number; // 0–10
}

export function predict(m: Match, ratings: Ratings): Prediction {
  const h = ratings[m.h] ?? { ef: MU, ea: MU };
  const a = ratings[m.a] ?? { ef: MU, ea: MU };
  // ataque propio × defensa rival, normalizado por la media.
  const xgHome = clamp(((h.ef * a.ea) / MU) * HOME_ADV);
  const xgAway = clamp((a.ef * h.ea) / MU);

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let best = -1;
  let bi = 0;
  let bj = 0;
  for (let i = 0; i <= MAXG; i++) {
    const pi = poisson(i, xgHome);
    for (let j = 0; j <= MAXG; j++) {
      const p = pi * poisson(j, xgAway);
      if (i > j) pHome += p;
      else if (i < j) pAway += p;
      else pDraw += p;
      if (p > best) {
        best = p;
        bi = i;
        bj = j;
      }
    }
  }
  const s = pHome + pDraw + pAway || 1;
  pHome /= s;
  pDraw /= s;
  pAway /= s;

  return {
    pHome,
    pDraw,
    pAway,
    xgHome,
    xgAway,
    score: [bi, bj],
    conf: Math.round(Math.max(pHome, pDraw, pAway) * 100) / 10,
  };
}

export function pct(x: number): number {
  return Math.round(x * 100);
}

// Marcador representativo a partir de probabilidades 1X2.
function scoreFromProbs(pH: number, pD: number, pA: number): [number, number] {
  const top = Math.max(pH, pD, pA);
  if (pD === top) return [1, 1];
  const strong = top > 0.55;
  if (pH === top) return strong ? [2, 0] : [2, 1];
  return strong ? [0, 2] : [1, 2];
}

// Mezcla la predicción del modelo con el MERCADO (cuotas). El mercado manda
// (más acertado); el modelo aporta cuando no hay cuotas o como matiz.
// market viene en 0–100 (o null). w = peso del mercado.
export function blend(
  pred: Prediction,
  market: { h: number; d: number; a: number } | null | undefined,
  w = 0.72,
): Prediction {
  if (!market) return pred;
  const mh = market.h / 100;
  const md = market.d / 100;
  const ma = market.a / 100;
  let pHome = (1 - w) * pred.pHome + w * mh;
  let pDraw = (1 - w) * pred.pDraw + w * md;
  let pAway = (1 - w) * pred.pAway + w * ma;
  const s = pHome + pDraw + pAway || 1;
  pHome /= s;
  pDraw /= s;
  pAway /= s;
  return {
    pHome,
    pDraw,
    pAway,
    xgHome: pred.xgHome,
    xgAway: pred.xgAway,
    score: scoreFromProbs(pHome, pDraw, pAway),
    conf: Math.round(Math.max(pHome, pDraw, pAway) * 100) / 10,
  };
}

// Nombre del equipo más probable según la predicción (para etiquetas).
export const teamRanks: Record<string, number> = RANK;
export type { Team };
