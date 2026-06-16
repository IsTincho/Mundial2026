import type { Verdict } from "../types";

export function Score({
  a,
  b,
  kind,
}: {
  a: number;
  b: number;
  kind: "amber" | "ink";
}) {
  return (
    <span className={"score " + kind}>
      {a}
      <span className="sep">:</span>
      {b}
    </span>
  );
}

const CHIP: Record<Verdict, { cls: string; label: string }> = {
  exact: { cls: "exact", label: "🎯 Exacto" },
  winner: { cls: "winner", label: "✅ Ganador" },
  miss: { cls: "miss", label: "❌ Fallado" },
  live: { cls: "live", label: "En vivo" },
  pending: { cls: "pending", label: "⏳ Pendiente" },
};

export function Chip({ v }: { v: Verdict }) {
  const c = CHIP[v];
  if (v === "live") {
    return (
      <span className="chip live">
        <span className="pulse" />
        {c.label}
      </span>
    );
  }
  return <span className={"chip " + c.cls}>{c.label}</span>;
}
