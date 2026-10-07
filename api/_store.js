// Storage backends for the dashboard's saved lists.
//
//   upstash : Upstash Redis over REST (Vercel Marketplace -> Upstash Redis). Used when its env vars exist.
//   file    : plain JSON files in .local-data/ (local development, STORE_BACKEND=file).
//   none    : nothing configured. Reads fall back to the JSON files in /data; writes are refused.
//
// The JSON files in /data are always the starting data: a list that has never been saved is served from there.
import fs from "node:fs";
import path from "node:path";

const PREFIX = "ed:";
const BAK = "ed-bak:";

export const KEY_RE = /^emotorad-[a-z0-9-]{1,60}$/;
export const MAX_VALUE_BYTES = 900 * 1024; // keeps every list under Upstash's 1 MB request limit

const dataDir = () => path.join(process.cwd(), "data");
const localDir = () => path.join(process.cwd(), process.env.LOCAL_DATA_DIR || ".local-data");

// ---------- seed files (/data/<key>.json) ----------
export function seedKeys() {
  try {
    return fs.readdirSync(dataDir()).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((k) => KEY_RE.test(k));
  } catch (e) {
    return [];
  }
}
export function seedValue(key) {
  if (!KEY_RE.test(key)) return null;
  try {
    return JSON.stringify(JSON.parse(fs.readFileSync(path.join(dataDir(), key + ".json"), "utf8")));
  } catch (e) {
    return null;
  }
}

// ---------- backends ----------
function upstashCreds() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(cmd) {
  const c = upstashCreds();
  const r = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Database error: " + (j.error || r.status));
  return j.result;
}

export function backendName() {
  if (process.env.STORE_BACKEND === "file") return "file";
  if (upstashCreds()) return "upstash";
  return "none";
}
export const isPersistent = () => backendName() !== "none";

const fileFor = (key, bak) => {
  const d = bak ? path.join(localDir(), "_backups") : localDir();
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, key + ".json");
};

async function rawGet(key) {
  const b = backendName();
  if (b === "upstash") return (await redis(["GET", PREFIX + key])) ?? null;
  if (b === "file") {
    try {
      return fs.readFileSync(fileFor(key), "utf8");
    } catch (e) {
      return null;
    }
  }
  return null;
}
async function rawSet(key, value, bak) {
  const b = backendName();
  if (b === "upstash") return redis(["SET", (bak ? BAK : PREFIX) + key, value]);
  if (b === "file") return fs.writeFileSync(fileFor(key, bak), value);
}

// ---------- public API ----------
// Saved value if the list was ever saved, else the starting data, else null.
export async function getValue(key) {
  if (!KEY_RE.test(key)) return null;
  const saved = await rawGet(key);
  return saved !== null ? saved : seedValue(key);
}

export async function setValue(key, value) {
  const prev = await rawGet(key);
  if (prev !== null && prev !== value) await rawSet(key, prev, true); // keep the previous version as a safety copy
  await rawSet(key, value, false);
}

export async function listKeys(prefix = "") {
  const keys = new Set(seedKeys());
  const b = backendName();
  if (b === "upstash") {
    const found = await redis(["KEYS", PREFIX + "emotorad-*"]);
    (found || []).forEach((k) => keys.add(k.slice(PREFIX.length)));
  } else if (b === "file") {
    try {
      fs.readdirSync(localDir()).filter((f) => f.endsWith(".json")).forEach((f) => keys.add(f.slice(0, -5)));
    } catch (e) {}
  }
  return [...keys].filter((k) => k.startsWith(prefix)).sort();
}
