# sattlerblog

Yaakov Sattler's site. Next.js 16 (App Router), static output.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3100
npm run build && npm start   # production build, same port
```

## Fonts - read this once

The site is set in **Almoni Neue**, a commercial font. Its files are not in
this repository, because the repository is public and committing a licensed
font file would redistribute it.

- Copy the six licensed files into `src/fonts/` (gitignored):
  `AlmoniNeue-Regular.otf`, `-Medium`, `-Bold`, `-Ultrabold`, `-Black`, `-Ultrablack`.
- Without them, `npm run dev` / `npm run build` write a Rubik (OFL) stand-in
  into the same paths so the build still compiles, and print a warning. That
  build is **not** the designed typography. To go back to the real font,
  delete `src/fonts/` and copy the licensed files in.

## Content

- Posts: `content/posts/*.md` - a temporary copy. Stage 4 of the Sanity plan
  moves the reader to Sanity and deletes this folder.
- Everything else under `src/data/`.

## Checks

```bash
npm run check                                  # the full harness (needs the server on 3100)
node scripts/baseline.mjs capture <dir>        # screenshots + HTML of every route at 390/768/1440
node scripts/baseline.mjs check <baseline-dir> # re-capture and diff: pixels, hydrated DOM, server HTML
```

The baseline output is large and lives outside the repo.
