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

// Vista principal del fixture.
export type View = "fecha" | "grupo" | "bracket";
// Densidad de la lista de partidos.
export type ViewMode = "cards" | "dense";

// Filtro por estado (categoría). "all" = sin filtro.
export type StatusFilter = "all" | "live" | "pending" | "exact" | "winner" | "miss";
// Filtro por confianza del modelo.
export type ConfFilter = "all" | "low" | "high";

export interface Filters {
  status: StatusFilter;
  conf: ConfFilter;
  confed: string | null; // confederación o null
  query: string;         // búsqueda por equipo/grupo
}

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

// Clasificado proyectado para el bracket.
export interface Qualifier {
  name: string;
  group: string;
  pos: 1 | 2 | 3;      // 1º, 2º o mejor tercero
  pts: number;
  dg: number;
  gf: number;
  seed: number;        // siembra global 1..32
}

// Llave del bracket (un cruce).
export interface BracketTie {
  round: string;       // "32avos" | "Octavos" | ...
  a: Qualifier | null;
  b: Qualifier | null;
}
