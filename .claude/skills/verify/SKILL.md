---
name: verify
description: How to build, run, and drive this ecommerce app (Express API + React/Vite client) to verify changes end-to-end.
---

# Verifying changes in this repo

## Runtime handles

- **API server**: `cd server && npm run dev:server` → http://localhost:5000. Often already running (check `Test-NetConnection localhost -Port 5000`). Nodemon hot-reloads server changes.
- **Client**: `cd client && npm run dev` → http://localhost:5173. Also often already running.
- **DB**: MongoDB Atlas via `server/.env` `MONGODB_URI`. Scripts that connect directly MUST set `dns.setServers(["8.8.8.8", "1.1.1.1"])` before `mongoose.connect` (local DNS refuses the SRV lookup). See `server/scripts/seed.js` for the pattern.

## Auth for API testing

- Client stores the JWT in `localStorage` under key `ecommerce_token`; axios sends it as `Authorization: Bearer`.
- To mint an admin token without a password, run a temp script from `server/` (so node_modules resolve) that loads dotenv, connects mongoose, finds a `role: ADMIN|SUPER_ADMIN` user, and calls `signAccessToken` from `src/utils/token.js`. Delete the script after.
- Multipart admin endpoints: use `curl.exe -F` (PowerShell 5.1 lacks `-Form`).

## Driving the UI

- Playwright works; Chromium is already in `%LOCALAPPDATA%\ms-playwright`. `npm i playwright` in a scratch dir is enough.
- Log in by injecting the token before load: `context.addInitScript(t => localStorage.setItem("ecommerce_token", t), TOKEN)`, then goto `/admin/...`.
- Admin list pages render loading skeletons first — `isVisible()` right after navigation races them; use `waitFor()` on the expected text instead.
- Admin list row cards are `div.p-3` — scope row actions as `page.locator('div.p-3:has-text("Row Title")').getByRole(...)`. Do NOT use `locator("div", { hasText }).last()` (matches ancestor divs and hits the wrong row).
- `window.confirm` deletes: `page.once("dialog", d => d.accept())` before clicking Delete.
- Homepage (`/`) may show a promotion popup modal first — close via `getByLabel("Close promotion")` before interacting.

## Gotchas

- Client lint: `npx eslint <files>` — react-hooks rules reject setState-in-effect; react-refresh rejects non-component exports from page files.
- `npm run build` in `client/` is the fastest whole-client syntax check (~2s).
- Cloudinary creds come from SystemSetting DB via `settingsService`, not `.env` — uploads work against the real cloud in dev.
