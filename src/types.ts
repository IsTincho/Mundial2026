// Tipos compartidos del prode.

export type Score = [number, number];

// Equipo en la tabla de grupos: [nombre, ranking mundial].
export type Team = [string, number];

export interface Match {
  g: string;          // grupo A..L
  f: 1 | 2 | 3;       // fecha / jornada
  d: string;          // fecha calendario ISO (YYYY-MM-DD)
  h: string;          // local
  a: string;          // visita
  p: Score;           // pronóstico [local, visita]
  c: number;          // confianza del modelo (0–10)
  r: Score | null;    // resultado semilla (real conocido) o null
  live?: boolean;     // true si está en juego (sin final)
  id: string;         // "G-F-Local-Visita" (estable)
}

export interface ProdeData {
  updated: string;
  groups: Record<string, Team[]>;
  matches: Match[];
}

export type Verdict = "exact" | "winner" | "miss" | "live" | "pending";
export type View = "fecha" | "grupo";

// Cargas manuales del usuario: { matchId: [local, visita] }.
export type Results = Record<string, Score>;

export interface Standing {
  name: string;
  rank: number;
  order: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
  dg: number;
}

export interface TrackerStats {
  played: number;
  winners: number;
  exacts: number;
  pct: number;
}
