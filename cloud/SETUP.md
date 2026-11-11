# Film Diary: the multi-user site

The code for the multi-user version of the diary: accounts, each person's own diary and plan, public profiles at `/u/<username>`, following, a friends feed, and the taste match.

- **Front end:** `public/`, built by `build_cloud.py` from the same files as the current site.
- **Server:** `functions/api/[[path]].js`, which runs as Cloudflare Pages Functions.
- **Database:** Cloudflare D1, a SQL database.

Everything fits in Cloudflare's free plan.

## Setting it up (once)

1. **Cloudflare account:** sign up for free at dash.cloudflare.com.
2. **Database:** go to Storage & Databases → D1 → Create, and name it `film-diary`.
3. **Site:** go to Workers & Pages → Create → Pages → Connect to Git, and pick the GitHub repo `five-years-cinema`. Then fill in:
   - Project name: `film-diary` (it must match `wrangler.toml`)
   - Production branch: `main`
   - Framework preset: None
   - Build command: *(leave empty)*
   - Build output directory: `public`
   - Root directory (under "Advanced"): `cloud`

   Then press Save and Deploy. The database connects itself: `wrangler.toml` names it (binding `DB`).
4. *(No step: the database binding comes from `wrangler.toml`.)*
5. **Secrets:** go to Settings → Variables and Secrets and add these, each as **Secret**:
   - `TMDB_TOKEN`: your TMDB "API Read Access Token". Posters and film search for everyone go through the site, so nobody else needs their own key.
   - `SIGNUP_CODE`: an invite code you give your friends. Without it, anyone could sign up.
   - `PEPPER` *(optional)*: any long random text. Set it **before the first account** and never change it.
6. **Redeploy:** under Deployments, choose Retry deployment, so the database and the secrets take effect.
7. **Your data:** open `https://<project>.pages.dev` and create your account. On the old site, go to Settings → Backup → **Download everything**, and pick that file on the new site's first screen.

## How it's built

- **Passwords:** the browser stretches the password with PBKDF2-SHA256, 600,000 rounds, salted with the username. The server then hashes that result again with its own random salt.
  - The password is never sent as typed.
  - This fits the free plan's limit of about 10 ms of CPU per request.
- **Sessions:**
  - The session cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
  - The database stores only a SHA-256 of each session token.
  - Changing your password signs out your other devices. Signing out clears the device.
- **Request checks:**
  - Requests that change something must come from the site itself. A POST must also be JSON.
  - Sign-in attempts are limited (10 per 15 minutes per username).
  - Sign-ups are limited (5 per hour per address).
  - Sizes are limited per change and per account.
- **Sync:** the server stores the app's own key-by-key store, and for each key the newest change wins.
  - A device sends the keys it changed.
  - It gets back whatever changed after the server sequence number it last saw.
- **Proxies:** TMDB requests (members only, a short list of allowed paths, cached for a day) and Letterboxd RSS (any username, cached for 30 minutes).
- **Deleting an account** removes every row that belongs to it.

## Running it locally

```
python3 build_cloud.py               # public/ from the shared files
node test/server.mjs 8790            # Cloudflare stand-in: D1 on node:sqlite, TMDB and Letterboxd from test/fixtures
node test/api_test.mjs               # 48 API checks
node test/e2e.cjs                    # two people, three devices, in a real browser (Playwright)
```
