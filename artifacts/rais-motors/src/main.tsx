import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof window !== "undefined") {
  const isAbort = (reason: unknown): boolean => {
    if (!reason) return false;
    const r = reason as { name?: string; message?: string; code?: number };
    if (r.name === "AbortError") return true;
    if (r.code === 20) return true;
    if (typeof r.message === "string" && /abort/i.test(r.message)) return true;
    return false;
  };

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isAbort(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  window.addEventListener(
    "error",
    (event) => {
      const err = event.error ?? { message: event.message };
      if (isAbort(err)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

createRoot(document.getElementById("root")!).render(<App />);
