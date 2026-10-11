# Query Quest

A retro, hands-on PostgreSQL course that runs entirely in the browser.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by Vite. Build for production with `npm run build`.

## What is included

- 16 guided lessons in five chapters, from the first `SELECT` to joins, transactions, indexes, `EXPLAIN`, and a final challenge.
- A live PostgreSQL console powered by [PGlite](https://pglite.dev/), with result tables, schema explorer, errors, and a reset button.
- A free playground with sample players, quests, and completions.
- Hints, solutions, automatic mission checks, and browser-saved progress.
- An original, procedurally generated 60-second chiptune. Sound is on by default and loops continuously; browsers that block autoplay start it on the first click or key press. The top-bar button mutes or unmutes it, and remembers your choice.

Each lesson starts with a fresh, in-memory PostgreSQL sandbox. The playground also starts fresh when opened again. PGlite provides one database per instance; the `CREATE DATABASE` exercise creates and switches to a new browser instance to teach the server-level command. Other SQL runs directly in PostgreSQL.

Run `node scripts/verify-course.mjs` to execute all lesson solutions and checks against PGlite.

## Deploy and measure usage

Deploy the repository to Vercel as a Vite project. The build command is `npm run build` and the output directory is `dist`. Production values live in `.env.production` and can be overridden with Vercel project environment variables:

- `SITE_URL`: the final HTTPS origin. Production uses `https://modulecraft.dev`. This adds canonical URLs, a sitemap, and a sitemap reference in `robots.txt`.
- `VITE_GA_MEASUREMENT_ID`: the GA4 web stream Measurement ID. The production value is set in `.env.production`; override it in Vercel only if you change streams. Tracking starts on page open. The ID is public and belongs in the Vite client environment, not a secret.

The build produces crawlable HTML for the homepage, every lesson, and the playground. Once deployed, submit `https://modulecraft.dev/sitemap.xml` in Google Search Console. Analytics tracks page views, successful SQL runs, and first time lesson completions. SQL text is never sent to Analytics.
