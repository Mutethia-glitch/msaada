# Vercel deployment notes

Msaada is prepared for Vercel with a Vite SPA build and a serverless Express/tRPC entrypoint at `api/index.ts`. `vercel.json` rewrites `/api/*` to that function and routes client-side paths to the SPA entrypoint.

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Production MySQL/TiDB connection string. Use a provider reachable from Vercel and enable SSL when required. |
| `JWT_SECRET` | Session-cookie signing secret. Generate a long random value. |
| `VITE_APP_ID` | Manus OAuth application ID. |
| `OAUTH_SERVER_URL` | OAuth server base URL. |
| `VITE_OAUTH_PORTAL_URL` | Browser login portal URL. |
| `OWNER_OPEN_ID` and `OWNER_NAME` | Project owner identity used by the authorization layer. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Only required for any retained Manus platform integrations. AI request analysis is not used by the current product flow. |

## Important caveats

The database schema must be migrated against the production database before opening the site. Vercel functions are request-scoped, so long-running workers and local file persistence are not supported. Uploaded files must use the configured object storage helpers, while the relational database stores only file references. OAuth callback URLs and cookie domains must be updated to the final Vercel domain. No real payments are processed.

The project has been build-checked with `pnpm check`, `pnpm test`, and `pnpm build`. Publishing still requires the user to import the repository into Vercel, add these environment variables, run the schema migration, configure the OAuth callback, and complete the deployment from their Vercel account.
