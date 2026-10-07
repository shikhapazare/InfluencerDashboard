// Gives the dashboard its `window.storage` (get / set / list).
//
//  - Database connected on the server: every save goes to /api/storage and is shared by everyone who opens the site.
//  - No database connected yet: saves stay in this browser (localStorage) on top of the starting data from /data/*.json.
//
// Either way the dashboard code is identical, so "Log content" and every other form saves automatically.
const API = "/api/storage";
const LS = "ed:";
let mode = null; // "server" | "local"

function announce(m) {
  window.__storageMode = m;
  try {
    window.dispatchEvent(new CustomEvent("storage-mode", { detail: m }));
  } catch (e) {}
}

async function getMode() {
  if (mode) return mode;
  const r = await fetch(API + "?status=1", { cache: "no-store" });
  if (!r.ok) throw new Error("Server unavailable (" + r.status + ")");
  const j = await r.json();
  mode = j.persistent ? "server" : "local";
  announce(mode);
  return mode;
}

const lsGet = (k) => {
  try {
    return localStorage.getItem(LS + k);
  } catch (e) {
    return null;
  }
};

async function serverGet(key) {
  const r = await fetch(API + "?key=" + encodeURIComponent(key), { cache: "no-store" });
  if (r.status === 404) throw new Error("Key not found");
  if (!r.ok) throw new Error("Server error (" + r.status + ")");
  return (await r.json()).value;
}

window.storage = {
  async get(key) {
    const m = await getMode();
    if (m === "local") {
      const saved = lsGet(key);
      if (saved !== null) return { key, value: saved, shared: true };
    }
    return { key, value: await serverGet(key), shared: true };
  },

  async set(key, value) {
    const m = await getMode();
    if (m === "local") {
      localStorage.setItem(LS + key, value);
      return { key, value, shared: true };
    }
    const r = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error("Save failed: " + (j.error || r.status));
    }
    return { key, value, shared: true };
  },

  async list(prefix = "") {
    const m = await getMode();
    const r = await fetch(API + "?prefix=" + encodeURIComponent(prefix), { cache: "no-store" });
    if (!r.ok) throw new Error("Server error (" + r.status + ")");
    const keys = new Set((await r.json()).keys);
    if (m === "local") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS + prefix)) keys.add(k.slice(LS.length));
        }
      } catch (e) {}
    }
    return { keys: [...keys] };
  },

  async delete(key) {
    try {
      localStorage.removeItem(LS + key);
    } catch (e) {}
    return { key, deleted: true };
  },
};
