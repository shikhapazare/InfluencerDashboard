// Tiny helpers that work with Vercel's req/res and with a plain Node http server (local dev and tests).
import { authState, CHALLENGE, UNCONFIGURED_MESSAGE } from "./_auth.js";

// Second check behind middleware.js, so the data stays locked even if the middleware isn't running.
// Returns true when the request may continue; otherwise it has already answered.
export function allowed(req, res) {
  const state = authState(req.headers.authorization);
  if (state === "ok") return true;
  if (state === "unconfigured") send(res, 503, { error: UNCONFIGURED_MESSAGE });
  else send(res, 401, { error: "Username and password required" }, { "WWW-Authenticate": CHALLENGE });
  return false;
}

export function send(res, code, obj, headers = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}

export function queryOf(req) {
  return Object.fromEntries(new URL(req.url, "http://localhost").searchParams.entries());
}

export async function bodyOf(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
