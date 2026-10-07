import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` also serves the /api routes, saving to plain JSON files in .local-data/.
// On Vercel the same files in /api run as serverless functions instead.
function devApi() {
  return {
    name: "dev-api",
    configureServer(server) {
      process.env.STORE_BACKEND = process.env.STORE_BACKEND || "file";
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/api\/(storage|export)(\?.*)?$/.exec(req.url || "");
        if (!m) return next();
        const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
        await mod.default(req, res);
      });
    },
  };
}

export default defineConfig({ plugins: [react(), devApi()] });
