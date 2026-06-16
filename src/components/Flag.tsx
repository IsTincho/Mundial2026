import { CODE } from "../data";

// Bandera del equipo (flag-icons, SVG offline). Si no hay código, cae a un
// recuadro con las 2 primeras letras para no romper el layout.
export function Flag({ team, size = "md" }: { team: string; size?: "sm" | "md" | "lg" }) {
  const code = CODE[team];
  if (!code) {
    const ab = team.replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase();
    return <span className={"flag flag-" + size + " flag-fallback"} aria-hidden="true">{ab}</span>;
  }
  return (
    <span
      className={"flag flag-" + size + " fi fi-" + code}
      role="img"
      aria-label={team}
    />
  );
}
