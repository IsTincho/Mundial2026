/* ============================================================================
   data.ts — Datos semilla del Prode Mundial 2026 (fase de grupos)
   ----------------------------------------------------------------------------
   Las predicciones salen de una simulación Montecarlo recalibrada con la forma
   real de la Fecha 1 (que fue rarísima: ~40% de empates). Los partidos con
   confianza < 6 son candidatos fuertes a empate.

   Esquema de cada partido: ver src/types.ts (Match).
   ============================================================================ */
import type { Match, Team } from "./types";

export const UPDATED = "2026-06-15";

// Listado oficial de cada grupo: [nombre, ranking mundial].
// El ranking es informativo: solo se usa como criterio de orden estable
// cuando dos equipos empatan en puntos, DG y GF.
export const GROUPS: Record<string, Team[]> = {
  A: [["México", 16], ["Corea del Sur", 22], ["Sudáfrica", 60], ["Chequia", 43]],
  B: [["Suiza", 18], ["Canadá", 29], ["Qatar", 56], ["Bosnia", 71]],
  C: [["Brasil", 5], ["Marruecos", 8], ["Escocia", 38], ["Haití", 83]],
  D: [["EE.UU.", 15], ["Turquía", 25], ["Australia", 27], ["Paraguay", 40]],
  E: [["Alemania", 10], ["Ecuador", 23], ["Costa de Marfil", 37], ["Curazao", 81]],
  F: [["Países Bajos", 7], ["Japón", 19], ["Suecia", 42], ["Túnez", 47]],
  G: [["Bélgica", 9], ["Irán", 20], ["Egipto", 31], ["Nueva Zelanda", 85]],
  H: [["España", 1], ["Uruguay", 17], ["Arabia Saudita", 61], ["Cabo Verde", 67]],
  I: [["Francia", 3], ["Senegal", 12], ["Noruega", 32], ["Irak", 58]],
  J: [["Argentina", 2], ["Austria", 24], ["Argelia", 28], ["Jordania", 64]],
  K: [["Portugal", 6], ["Colombia", 14], ["RD Congo", 48], ["Uzbekistán", 52]],
  L: [["Inglaterra", 4], ["Croacia", 11], ["Panamá", 33], ["Ghana", 72]],
};

type RawMatch = Omit<Match, "id">;

const RAW: RawMatch[] = [
  // ---- Grupo A ----
  { g: "A", f: 1, d: "2026-06-11", h: "México", a: "Sudáfrica", p: [2, 0], c: 8.0, r: [2, 0] },
  { g: "A", f: 1, d: "2026-06-12", h: "Corea del Sur", a: "Chequia", p: [2, 1], c: 5.3, r: [2, 1] },
  { g: "A", f: 2, d: "2026-06-18", h: "Chequia", a: "Sudáfrica", p: [1, 0], c: 4.6, r: null },
  { g: "A", f: 2, d: "2026-06-18", h: "México", a: "Corea del Sur", p: [1, 0], c: 5.2, r: null },
  { g: "A", f: 3, d: "2026-06-25", h: "Chequia", a: "México", p: [0, 1], c: 6.6, r: null },
  { g: "A", f: 3, d: "2026-06-25", h: "Sudáfrica", a: "Corea del Sur", p: [0, 1], c: 6.0, r: null },

  // ---- Grupo B ----
  { g: "B", f: 1, d: "2026-06-12", h: "Canadá", a: "Bosnia", p: [1, 1], c: 4.8, r: [1, 1] },
  { g: "B", f: 1, d: "2026-06-13", h: "Qatar", a: "Suiza", p: [0, 2], c: 7.5, r: [1, 1] },
  { g: "B", f: 2, d: "2026-06-18", h: "Suiza", a: "Bosnia", p: [1, 0], c: 5.6, r: null },
  { g: "B", f: 2, d: "2026-06-18", h: "Canadá", a: "Qatar", p: [2, 0], c: 6.6, r: null },
  { g: "B", f: 3, d: "2026-06-24", h: "Suiza", a: "Canadá", p: [0, 1], c: 4.2, r: null },
  { g: "B", f: 3, d: "2026-06-24", h: "Bosnia", a: "Qatar", p: [1, 0], c: 4.1, r: null },

  // ---- Grupo C ----
  { g: "C", f: 1, d: "2026-06-13", h: "Brasil", a: "Marruecos", p: [2, 1], c: 4.5, r: [1, 1] },
  { g: "C", f: 1, d: "2026-06-14", h: "Haití", a: "Escocia", p: [0, 1], c: 6.3, r: [0, 1] },
  { g: "C", f: 2, d: "2026-06-19", h: "Brasil", a: "Haití", p: [2, 0], c: 8.7, r: null },
  { g: "C", f: 2, d: "2026-06-19", h: "Escocia", a: "Marruecos", p: [0, 2], c: 6.6, r: null },
  { g: "C", f: 3, d: "2026-06-24", h: "Escocia", a: "Brasil", p: [0, 2], c: 6.8, r: null },
  { g: "C", f: 3, d: "2026-06-24", h: "Marruecos", a: "Haití", p: [2, 0], c: 8.5, r: null },

  // ---- Grupo D ----
  { g: "D", f: 1, d: "2026-06-13", h: "EE.UU.", a: "Paraguay", p: [2, 0], c: 5.6, r: [4, 1] },
  { g: "D", f: 1, d: "2026-06-14", h: "Australia", a: "Turquía", p: [1, 2], c: 4.1, r: [2, 0] },
  { g: "D", f: 2, d: "2026-06-19", h: "EE.UU.", a: "Australia", p: [1, 0], c: 4.8, r: null },
  { g: "D", f: 2, d: "2026-06-20", h: "Turquía", a: "Paraguay", p: [1, 0], c: 4.6, r: null },
  { g: "D", f: 3, d: "2026-06-26", h: "Turquía", a: "EE.UU.", p: [0, 1], c: 6.1, r: null },
  { g: "D", f: 3, d: "2026-06-26", h: "Paraguay", a: "Australia", p: [0, 1], c: 5.9, r: null },

  // ---- Grupo E ----
  { g: "E", f: 1, d: "2026-06-14", h: "Alemania", a: "Curazao", p: [3, 0], c: 9.4, r: [7, 1] },
  { g: "E", f: 1, d: "2026-06-14", h: "Costa de Marfil", a: "Ecuador", p: [1, 0], c: 4.0, r: [1, 0] },
  { g: "E", f: 2, d: "2026-06-20", h: "Alemania", a: "Costa de Marfil", p: [1, 0], c: 6.4, r: null },
  { g: "E", f: 2, d: "2026-06-20", h: "Ecuador", a: "Curazao", p: [2, 0], c: 8.1, r: null },
  { g: "E", f: 3, d: "2026-06-25", h: "Curazao", a: "Costa de Marfil", p: [0, 2], c: 8.3, r: null },
  { g: "E", f: 3, d: "2026-06-25", h: "Ecuador", a: "Alemania", p: [0, 2], c: 6.6, r: null },

  // ---- Grupo F ----
  { g: "F", f: 1, d: "2026-06-14", h: "Países Bajos", a: "Japón", p: [2, 1], c: 5.7, r: [2, 2] },
  { g: "F", f: 1, d: "2026-06-14", h: "Suecia", a: "Túnez", p: [1, 0], c: 5.5, r: [5, 1] },
  { g: "F", f: 2, d: "2026-06-20", h: "Países Bajos", a: "Suecia", p: [1, 0], c: 4.9, r: null },
  { g: "F", f: 2, d: "2026-06-20", h: "Túnez", a: "Japón", p: [0, 2], c: 7.2, r: null },
  { g: "F", f: 3, d: "2026-06-26", h: "Túnez", a: "Países Bajos", p: [0, 2], c: 7.8, r: null },
  { g: "F", f: 3, d: "2026-06-26", h: "Japón", a: "Suecia", p: [1, 0], c: 4.2, r: null },

  // ---- Grupo G ----
  { g: "G", f: 1, d: "2026-06-15", h: "Bélgica", a: "Egipto", p: [1, 0], c: 6.3, r: [1, 1] },
  { g: "G", f: 1, d: "2026-06-15", h: "Irán", a: "Nueva Zelanda", p: [2, 0], c: 7.7, r: null, live: true },
  { g: "G", f: 2, d: "2026-06-21", h: "Bélgica", a: "Irán", p: [1, 0], c: 5.3, r: null },
  { g: "G", f: 2, d: "2026-06-21", h: "Nueva Zelanda", a: "Egipto", p: [0, 2], c: 6.8, r: null },
  { g: "G", f: 3, d: "2026-06-27", h: "Nueva Zelanda", a: "Bélgica", p: [0, 2], c: 7.9, r: null },
  { g: "G", f: 3, d: "2026-06-27", h: "Egipto", a: "Irán", p: [1, 0], c: 3.9, r: null },

  // ---- Grupo H ----
  { g: "H", f: 1, d: "2026-06-15", h: "España", a: "Cabo Verde", p: [3, 0], c: 9.3, r: [0, 0] },
  { g: "H", f: 1, d: "2026-06-15", h: "Arabia Saudita", a: "Uruguay", p: [0, 2], c: 7.2, r: [1, 1] },
  { g: "H", f: 2, d: "2026-06-21", h: "Uruguay", a: "Cabo Verde", p: [2, 0], c: 7.2, r: null },
  { g: "H", f: 2, d: "2026-06-21", h: "España", a: "Arabia Saudita", p: [2, 0], c: 8.3, r: null },
  { g: "H", f: 3, d: "2026-06-27", h: "Cabo Verde", a: "Arabia Saudita", p: [0, 1], c: 4.6, r: null },
  { g: "H", f: 3, d: "2026-06-27", h: "Uruguay", a: "España", p: [0, 1], c: 6.1, r: null },

  // ---- Grupo I ----
  { g: "I", f: 1, d: "2026-06-16", h: "Francia", a: "Senegal", p: [1, 0], c: 6.3, r: null },
  { g: "I", f: 1, d: "2026-06-16", h: "Irak", a: "Noruega", p: [0, 1], c: 6.3, r: null },
  { g: "I", f: 2, d: "2026-06-22", h: "Noruega", a: "Senegal", p: [0, 1], c: 4.4, r: null },
  { g: "I", f: 2, d: "2026-06-22", h: "Francia", a: "Irak", p: [2, 0], c: 8.8, r: null },
  { g: "I", f: 3, d: "2026-06-26", h: "Noruega", a: "Francia", p: [0, 2], c: 7.0, r: null },
  { g: "I", f: 3, d: "2026-06-26", h: "Senegal", a: "Irak", p: [2, 0], c: 7.0, r: null },

  // ---- Grupo J ----
  { g: "J", f: 1, d: "2026-06-16", h: "Argentina", a: "Argelia", p: [2, 0], c: 8.4, r: null },
  { g: "J", f: 1, d: "2026-06-17", h: "Austria", a: "Jordania", p: [1, 0], c: 6.4, r: null },
  { g: "J", f: 2, d: "2026-06-22", h: "Argentina", a: "Austria", p: [2, 0], c: 7.9, r: null },
  { g: "J", f: 2, d: "2026-06-23", h: "Jordania", a: "Argelia", p: [0, 1], c: 5.6, r: null },
  { g: "J", f: 3, d: "2026-06-28", h: "Argelia", a: "Austria", p: [0, 1], c: 4.5, r: null },
  { g: "J", f: 3, d: "2026-06-28", h: "Jordania", a: "Argentina", p: [0, 3], c: 9.4, r: null },

  // ---- Grupo K ----
  { g: "K", f: 1, d: "2026-06-17", h: "Portugal", a: "RD Congo", p: [2, 0], c: 7.8, r: null },
  { g: "K", f: 1, d: "2026-06-17", h: "Uzbekistán", a: "Colombia", p: [0, 2], c: 7.0, r: null },
  { g: "K", f: 2, d: "2026-06-23", h: "Portugal", a: "Uzbekistán", p: [2, 0], c: 8.1, r: null },
  { g: "K", f: 2, d: "2026-06-24", h: "Colombia", a: "RD Congo", p: [1, 0], c: 6.5, r: null },
  { g: "K", f: 3, d: "2026-06-28", h: "Colombia", a: "Portugal", p: [0, 1], c: 5.1, r: null },
  { g: "K", f: 3, d: "2026-06-28", h: "RD Congo", a: "Uzbekistán", p: [1, 0], c: 4.1, r: null },

  // ---- Grupo L ----
  { g: "L", f: 1, d: "2026-06-17", h: "Inglaterra", a: "Croacia", p: [1, 0], c: 5.2, r: null },
  { g: "L", f: 1, d: "2026-06-17", h: "Ghana", a: "Panamá", p: [0, 1], c: 3.7, r: null },
  { g: "L", f: 2, d: "2026-06-23", h: "Inglaterra", a: "Ghana", p: [2, 0], c: 7.8, r: null },
  { g: "L", f: 2, d: "2026-06-23", h: "Panamá", a: "Croacia", p: [0, 1], c: 6.6, r: null },
  { g: "L", f: 3, d: "2026-06-27", h: "Panamá", a: "Inglaterra", p: [0, 2], c: 7.7, r: null },
  { g: "L", f: 3, d: "2026-06-27", h: "Croacia", a: "Ghana", p: [1, 0], c: 6.5, r: null },
];

// id estable por partido: "G-F-Local-Visita".
export const MATCHES: Match[] = RAW.map((m) => ({
  ...m,
  id: `${m.g}-${m.f}-${m.h}-${m.a}`,
}));
