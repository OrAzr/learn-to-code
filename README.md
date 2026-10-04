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
