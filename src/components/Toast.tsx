import { useEffect, useState } from "react";

// Hook simple de toast: devuelve el nodo y una función para mostrar mensajes.
export function useToast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [show, msg]);

  const toast = (m: string) => {
    setMsg(m);
    setShow(true);
  };

  const node = (
    <div id="toast" role="status" aria-live="polite" className={show ? "show" : ""}>
      {msg}
    </div>
  );

  return { toast, node };
}
