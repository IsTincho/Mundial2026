import type { Verdict } from "../types";

const VERDICT: Record<Verdict, { cls: string; label: string }> = {
  exact: { cls: "exact", label: "Exacto" },
  winner: { cls: "winner", label: "Ganador" },
  miss: { cls: "miss", label: "Fallado" },
  live: { cls: "live", label: "En vivo" },
  pending: { cls: "pending", label: "Pendiente" },
};

export function VerdictTag({ v }: { v: Verdict }) {
  const c = VERDICT[v];
  return (
    <span className={"verdict " + c.cls}>
      {v === "live" && <span className="pd" />}
      {c.label}
    </span>
  );
}
