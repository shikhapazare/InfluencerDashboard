// GET  /api/storage?status=1          -> { persistent, backend }
// GET  /api/storage?prefix=emotorad-  -> { keys: [...] }
// GET  /api/storage?key=<key>         -> { key, value }   (404 when the list doesn't exist)
// PUT  /api/storage  {key, value}     -> { ok: true }     (503 when no database is connected)
import { send, queryOf, bodyOf, allowed } from "./_http.js";
import { KEY_RE, MAX_VALUE_BYTES, backendName, isPersistent, getValue, setValue, listKeys } from "./_store.js";

export default async function handler(req, res) {
  try {
    if (!allowed(req, res)) return;
    const q = queryOf(req);

    if (req.method === "GET") {
      if (q.status) return send(res, 200, { persistent: isPersistent(), backend: backendName() });
      if (q.key !== undefined) {
        if (!KEY_RE.test(q.key)) return send(res, 400, { error: "Invalid key" });
        const value = await getValue(q.key);
        if (value === null) return send(res, 404, { error: "Key not found" });
        return send(res, 200, { key: q.key, value });
      }
      return send(res, 200, { keys: await listKeys(q.prefix || "") });
    }

    if (req.method === "PUT" || req.method === "POST") {
      if (!isPersistent()) return send(res, 503, { error: "No database connected" });
      const { key, value } = await bodyOf(req);
      if (typeof key !== "string" || !KEY_RE.test(key)) return send(res, 400, { error: "Invalid key" });
      if (typeof value !== "string") return send(res, 400, { error: "Value must be a string" });
      if (Buffer.byteLength(value) > MAX_VALUE_BYTES) return send(res, 413, { error: "Value too large" });
      try {
        JSON.parse(value);
      } catch (e) {
        return send(res, 400, { error: "Value must be valid JSON" });
      }
      await setValue(key, value);
      return send(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}
