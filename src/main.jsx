import "./storage.js"; // must load first: the dashboard reads window.storage as soon as it starts
import "./index.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard.jsx";

function StorageNotice() {
  const [mode, setMode] = useState(window.__storageMode || null);
  useEffect(() => {
    const on = (e) => setMode(e.detail);
    window.addEventListener("storage-mode", on);
    return () => window.removeEventListener("storage-mode", on);
  }, []);
  if (mode !== "local") return null;
  return (
    <div
      style={{ position: "fixed", right: 12, bottom: 12, zIndex: 100, maxWidth: 320 }}
      className="text-[11px] bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-md px-3 py-2 backdrop-blur"
    >
      No database connected yet — your changes are saved in this browser only. See the README to connect one so
      everyone shares the same data.
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <>
    <Dashboard />
    <StorageNotice />
  </>
);
