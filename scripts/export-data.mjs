// Pull the live data from your deployed site into /data/*.json so it can be committed to git.
//   npm run export-data -- https://your-site.vercel.app
// The site asks for a username and password: set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD in your terminal first.
import fs from "node:fs";
import path from "node:path";

const site = (process.argv[2] || "").replace(/\/$/, "");
if (!site) {
  console.error("Usage: npm run export-data -- https://your-site.vercel.app");
  process.exit(1);
}
const { BASIC_AUTH_USER: user, BASIC_AUTH_PASSWORD: password } = process.env;
const headers = user && password ? { Authorization: "Basic " + Buffer.from(user + ":" + password).toString("base64") } : {};
const res = await fetch(site + "/api/export", { headers });
if (res.status === 401) throw new Error("Export failed: wrong or missing BASIC_AUTH_USER / BASIC_AUTH_PASSWORD");
if (!res.ok) throw new Error("Export failed: " + res.status);
const backup = await res.json();
const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
for (const [key, value] of Object.entries(backup.data)) {
  fs.writeFileSync(path.join(dir, key + ".json"), JSON.stringify(JSON.parse(value), null, 1));
  console.log("wrote data/" + key + ".json");
}
