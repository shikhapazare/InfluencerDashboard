// GET /api/export -> downloads every saved list as one backup file
// (same format as the dashboard's "Back up data" button, so it can be loaded with "Restore from backup").
import { send } from "./_http.js";
import { getValue, listKeys } from "./_store.js";

export default async function handler(req, res) {
  try {
    const data = {};
    for (const k of await listKeys("emotorad-")) {
      const v = await getValue(k);
      if (v !== null) data[k] = v;
    }
    const day = new Date().toISOString().slice(0, 10);
    return send(
      res,
      200,
      { app: "emotorad-influencer-dashboard", version: 1, savedAt: new Date().toISOString(), data },
      { "Content-Disposition": `attachment; filename="emotorad-dashboard-backup-${day}.json"` }
    );
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}
