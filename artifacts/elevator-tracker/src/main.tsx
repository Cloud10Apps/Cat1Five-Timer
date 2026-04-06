import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import App from "./App";
import "./index.css";

// Enable strict-mode date parsing (used by isValidDateStr across all form pages)
dayjs.extend(customParseFormat);

/**
 * Safety net: some third-party libraries (react-datepicker's Popper.js cleanup,
 * etc.) can reject Promises with non-Error values (null/undefined).  Wrap them
 * so Vite's error overlay never fires for library-internal unhandled rejections.
 * Our own code always rejects with proper Error sub-classes.
 */
window.addEventListener("unhandledrejection", (event) => {
  if (!(event.reason instanceof Error)) {
    event.preventDefault();
    console.warn(
      "[unhandledrejection suppressed]",
      typeof event.reason === "string" ? event.reason : "(non-Error reason)",
      event.reason,
    );
  }
});

createRoot(document.getElementById("root")!).render(<App />);
