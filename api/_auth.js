// Browser username/password box (HTTP Basic auth), shared by middleware.js and the /api routes.
//
//   BASIC_AUTH_USER / BASIC_AUTH_PASSWORD : the one login everybody uses. Set both in Vercel.
//
// On Vercel the site stays locked until both are set. Locally (`npm run dev`) nothing is asked unless they are set.
export const CHALLENGE = 'Basic realm="EMotorad Influencer Ops", charset="UTF-8"';

// Compares every character so the time taken doesn't reveal how much of a guess was right.
function same(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  return diff === 0;
}

function credentialsOf(header) {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header || "");
  if (!m) return null;
  try {
    const text = new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)));
    const i = text.indexOf(":");
    return i < 0 ? null : { user: text.slice(0, i), password: text.slice(i + 1) };
  } catch (e) {
    return null;
  }
}

// "ok" | "denied" | "unconfigured"
export function authState(header, env = process.env) {
  const user = env.BASIC_AUTH_USER;
  const password = env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return env.VERCEL ? "unconfigured" : "ok";
  const given = credentialsOf(header);
  if (!given) return "denied";
  const userOk = same(given.user, user);
  const passwordOk = same(given.password, password);
  return userOk && passwordOk ? "ok" : "denied";
}

export const UNCONFIGURED_MESSAGE =
  "This site is locked: set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD in the Vercel project settings, then redeploy.";
