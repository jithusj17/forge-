# Deploying Forge

Target: **Vercel** (app) + **Turso** (database) + **GitHub OAuth** (sign-in). All three have free tiers that cover a portfolio demo. Forge works without a Claude key (demo mode), so the public demo costs nothing to run.

## 1. Push the repository to GitHub

```bash
gh repo create forge --public --source . --push
```

## 2. Create the database (Turso)

```bash
# https://docs.turso.tech/cli/installation
turso auth login
turso db create forge
turso db show forge --url          # -> DATABASE_URL (libsql://…)
turso db tokens create forge       # -> DATABASE_AUTH_TOKEN
```

Apply the migrations once from your machine:

```bash
DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run db:migrate
```

Run the same command again whenever a new migration is added in `drizzle/`.

## 3. Create the Vercel project

Import the GitHub repo at https://vercel.com/new. The framework (Next.js) is detected automatically. Before the first deploy, add these environment variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | Turso URL from step 2 |
| `DATABASE_AUTH_TOKEN` | Turso token from step 2 |
| `BETTER_AUTH_SECRET` | output of `npx auth@1.7.12 secret` (or any 32+ random characters) |
| `BETTER_AUTH_URL` | your production URL, e.g. `https://forge-yourname.vercel.app` |

Deploy. The demo already works: guest sign-in, demo generations, sharing.

## 4. Enable "Continue with GitHub" (optional)

1. https://github.com/settings/developers → **New OAuth App**
2. Homepage URL: your production URL
3. Authorization callback URL: `https://<your-domain>/api/auth/callback/github`
4. Copy the Client ID, generate a client secret, then add both to Vercel as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, and redeploy.

## 5. Enable real Claude generations (optional)

Two options, which can be combined:

- **Bring your own key (free for you):** nothing to configure. Visitors paste their own Anthropic key under **Settings & API key**.
- **Server key:** set `ANTHROPIC_API_KEY` in Vercel. Signed-in (non-guest) users get `SERVER_KEY_DAILY_LIMIT` Claude generations per day (default 5) on your key; after that they fall back to demo mode. Set a spend limit in the Anthropic Console as well.

Generation requests can run for minutes, so the route sets `maxDuration = 300`. Check your Vercel plan's maximum function duration. If it's lower, long Claude turns can be cut off, so use a faster setting (Forge Max Fast / Pro) or raise the plan.

## Checklist

- [ ] `npm run db:migrate` run against Turso
- [ ] `BETTER_AUTH_URL` matches the deployed domain exactly (https, no trailing slash)
- [ ] GitHub callback URL matches `<BETTER_AUTH_URL>/api/auth/callback/github`
- [ ] Anthropic spend limit set (if using a server key)
