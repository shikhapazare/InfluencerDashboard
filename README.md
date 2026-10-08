# EMotorad Influencer Ops

Influencer dashboard (CRM, Campaigns, Monthly Tracking, Logistics, Team, Sales, Payments, Performance) as a
Vite + React app with Vercel serverless API routes.

## How data is stored

| Where | What |
|---|---|
| `data/*.json` | The starting data (10 files, one per list). A list that was never saved is served from here. |
| Database (Upstash Redis) | Everything saved after that. Every form, including **Log content**, saves here automatically. |

Before a database is connected the app still works: changes are saved in the visitor's browser only, and a notice says so.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project →** import the repo. The framework is detected as Vite. Click **Deploy**.
3. Connect the database (this is what makes saves shared and permanent):
   **Project → Storage → Marketplace → Upstash Redis → Connect to this project.**
   Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables for you.
4. **Redeploy** (Deployments → ⋯ → Redeploy). The "saved in this browser only" notice disappears.

## Username and password

The whole site (pages and data) sits behind one shared login, asked for by the browser's own sign-in box.

1. In Vercel: **Project → Settings → Environment Variables**, add `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`
   for all environments.
2. **Redeploy.** Until both are set, the deployed site shows a "locked" message instead of the dashboard.

To change the password, edit the variable and redeploy; everyone is asked again. There is no log-out button:
the browser remembers the login until it is closed. `npm run dev` on your own machine does not ask.

## Bring over your live data from the Claude artifact

In the old dashboard click **Back up data** (bottom of the left menu) to download a file.
On the new site click **Restore from backup** and choose that file.

## Back up / export

- **Back up data** button in the app, or open `https://<your-site>/api/export`.
- To put the live data back into git as the new starting data:
  `npm run export-data -- https://<your-site>`, then commit the changed `data/*.json` files.
  Set `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` in your terminal first so the script can sign in.
- The previous version of each list is kept automatically as a safety copy in the database.

## Run locally

```
npm install
npm run dev
```

Local saves go to plain JSON files in `.local-data/` (git-ignored). The `data/` starting files are never modified.

## Good to know

- Each list is saved whole, so if two people edit the same list at the same moment, the last save wins.
- Upstash's free plan limits each saved list to about 1 MB; the biggest list today is about 90 KB.
- Everyone shares the one login, so the dashboard can't tell who made a change, and removing one person
  means changing the password for all.
