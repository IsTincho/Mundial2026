// Estado de las cargas del usuario, persistido en localStorage.
// El estado en memoria manda; localStorage es solo persistencia, envuelto en
// try/catch para degradar sin romper si está bloqueado.
import { useCallback, useEffect, useState } from "react";
import type { Results, Score } from "../types";

const STORAGE_KEY = "prode2026:results";

function load(): Results {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as unknown;
    return obj && typeof obj === "object" ? (obj as Results) : {};
  } catch {
    return {};
  }
}

export function useResults() {
  const [results, setResults] = useState<Results>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch {
      /* almacenamiento bloqueado: seguimos solo en memoria */
    }
  }, [results]);

  const setScore = useCallback((id: string, score: Score) => {
    setResults((prev) => ({ ...prev, [id]: score }));
  }, []);

  const clearScore = useCallback((id: string) => {
    setResults((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const applyPatch = useCallback((patch: Results) => {
    if (!Object.keys(patch).length) return;
    setResults((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetAll = useCallback(() => setResults({}), []);

  return { results, setScore, clearScore, applyPatch, resetAll };
}
