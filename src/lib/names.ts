// Normalización y mapeo de nombres de equipos (API en inglés → nombre canónico).
// Compartido por sync.ts (resultados finales) y live.ts (en vivo).
import type { Team } from "../types";

export function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export const NAME_ALIASES: Record<string, string> = {
  "mexico": "México", "south korea": "Corea del Sur", "korea republic": "Corea del Sur",
  "south africa": "Sudáfrica", "czechia": "Chequia", "czech republic": "Chequia",
  "switzerland": "Suiza", "canada": "Canadá", "qatar": "Qatar",
  "bosnia and herzegovina": "Bosnia", "bosnia herzegovina": "Bosnia", "bosnia": "Bosnia",
  "brazil": "Brasil", "morocco": "Marruecos", "scotland": "Escocia", "haiti": "Haití",
  "united states": "EE.UU.", "usa": "EE.UU.", "united states of america": "EE.UU.",
  "turkey": "Turquía", "turkiye": "Turquía", "australia": "Australia", "paraguay": "Paraguay",
  "germany": "Alemania", "ecuador": "Ecuador",
  "ivory coast": "Costa de Marfil", "cote divoire": "Costa de Marfil", "cote d ivoire": "Costa de Marfil",
  "curacao": "Curazao", "netherlands": "Países Bajos", "holland": "Países Bajos",
  "japan": "Japón", "sweden": "Suecia", "tunisia": "Túnez", "belgium": "Bélgica",
  "iran": "Irán", "ir iran": "Irán", "egypt": "Egipto", "new zealand": "Nueva Zelanda",
  "spain": "España", "uruguay": "Uruguay", "saudi arabia": "Arabia Saudita",
  "cape verde": "Cabo Verde", "cabo verde": "Cabo Verde", "france": "Francia",
  "senegal": "Senegal", "norway": "Noruega", "iraq": "Irak", "argentina": "Argentina",
  "austria": "Austria", "algeria": "Argelia", "jordan": "Jordania", "portugal": "Portugal",
  "colombia": "Colombia", "dr congo": "RD Congo", "congo dr": "RD Congo",
  "democratic republic of the congo": "RD Congo", "uzbekistan": "Uzbekistán",
  "england": "Inglaterra", "croatia": "Croacia", "panama": "Panamá", "ghana": "Ghana",
};

// Devuelve una función que mapea un nombre de la API al nombre canónico (o null).
// Incluye los propios nombres en español (de los grupos) además de los alias.
export function makeNameMapper(groups: Record<string, Team[]>): (s?: string) => string | null {
  const alias: Record<string, string> = {};
  for (const k of Object.keys(NAME_ALIASES)) alias[norm(k)] = NAME_ALIASES[k];
  for (const g of Object.keys(groups)) {
    for (const t of groups[g]) alias[norm(t[0])] = t[0];
  }
  return (s) => (s ? alias[norm(s)] || null : null);
}
