// Runs on Vercel before every request (pages, files and /api) and asks for the shared username and password.
// See api/_auth.js for the settings.
import { authState, CHALLENGE, UNCONFIGURED_MESSAGE } from "./api/_auth.js";

const text = (status, body, headers = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers } });

export default function middleware(request) {
  const state = authState(request.headers.get("authorization"));
  if (state === "ok") return new Response(null, { headers: { "x-middleware-next": "1" } }); // carry on to the site
  if (state === "unconfigured") return text(503, UNCONFIGURED_MESSAGE);
  return text(401, "Username and password required.", { "WWW-Authenticate": CHALLENGE });
}
