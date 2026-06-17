// Modelo de predicción (reproducible, sin datos externos).
// Poisson bivariado a partir de la fuerza de cada equipo (ranking FIFA de
// data.ts). Devuelve probabilidades 1X2, goles esperados (xG) y el marcador
// más probable. Corre en runtime para TODOS los partidos (incluye fecha 2 y 3),
// así que no hay nada que "regenerar" a mano.
import type { Match } from "../types";
import { GROUPS } from "../data";

// Ranking mundial por equipo (1 = mejor), tomado del listado de grupos.
const RANK: Record<string, number> = {};
for (const g of Object.keys(GROUPS)) {
  for (const [name, rank] of GROUPS[g]) RANK[name] = rank;
}

// Parámetros del modelo (calibrados a la media de goles de un Mundial).
const AVG_TOTAL = 2.6; // goles promedio por partido
const K = 0.6; // sensibilidad a la diferencia de fuerza
const HOME_ADV = 0.2; // ventaja del "local" del fixture (sedes mayormente neutrales)
const MAXG = 8; // goles máximos a considerar en la matriz

function strength(rank: number): number {
  return -Math.log(rank); // mejor ranking → más fuerza
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function poisson(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export interface Prediction {
  pHome: number; // prob. gana local (0–1)
  pDraw: number; // prob. empate
  pAway: number; // prob. gana visita
  xgHome: number; // goles esperados local
  xgAway: number; // goles esperados visita
  score: [number, number]; // marcador más probable
  conf: number; // confianza 0–10 (prob. del resultado más probable)
}

const cache = new Map<string, Prediction>();

export function predict(m: Match): Prediction {
  const hit = cache.get(m.id);
  if (hit) return hit;

  const rh = RANK[m.h] ?? 50;
  const ra = RANK[m.a] ?? 50;
  const sup = K * (strength(rh) - strength(ra)) + HOME_ADV;
  const xgHome = Math.max(0.2, AVG_TOTAL / 2 + sup / 2);
  const xgAway = Math.max(0.2, AVG_TOTAL / 2 - sup / 2);

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

  const pred: Prediction = {
    pHome,
    pDraw,
    pAway,
    xgHome,
    xgAway,
    score: [bi, bj],
    conf: Math.round(Math.max(pHome, pDraw, pAway) * 100) / 10,
  };
  cache.set(m.id, pred);
  return pred;
}

export function pct(x: number): number {
  return Math.round(x * 100);
}
