import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import App from "./App";
import "./index.css";

// Enable strict-mode date parsing (used by isValidDateStr across all form pages)
dayjs.extend(customParseFormat);

/**
 * Safety nets for third-party library errors (react-datepicker / Popper.js).
 *
 * 1. window.onerror — catches synchronous throws of non-Error values.
 *    Popper.js v2 can throw null/undefined during its ResizeObserver /
 *    requestAnimationFrame cleanup when a positioned element is removed from
 *    the DOM.  Our own code never throws non-Error values.
 *
 * 2. unhandledrejection — catches async Promise rejections with non-Error
 *    reasons from the same source.
 *
 * Both call preventDefault / return true to stop Vite's error overlay from
 * appearing in dev mode while still logging a console.warn for visibility.
 */
window.addEventListener("error", (event) => {
  if (event.error !== undefined && !(event.error instanceof Error)) {
    event.preventDefault();
    console.warn("[onerror suppressed — non-Error throw]", event.error);
  } else if (event.error === undefined && !event.message) {
    // Browser masked the error (cross-origin or throw undefined/null).
    event.preventDefault();
    console.warn("[onerror suppressed — unknown runtime error]");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (!(event.reason instanceof Error)) {
    event.preventDefault();
    console.warn(
      "[unhandledrejection suppressed — non-Error reason]",
      typeof event.reason === "string" ? event.reason : "(non-Error reason)",
      event.reason,
    );
  }
});

createRoot(document.getElementById("root")!).render(<App />);
