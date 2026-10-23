/*
 * Runs before `dev` and `build` (npm pre-scripts).
 *
 * The site is set in Almoni Neue, a commercial font. Its files are NOT in this
 * repository: the repository is public, and putting a licensed font file in a
 * public repo is redistributing it. Copy the six licensed files into src/fonts/
 * by hand (they are gitignored) - see README.
 *
 * Without them, src/app/layout.tsx cannot compile, because next/font/local
 * needs every file it names. So when they are missing this writes Rubik (SIL
 * Open Font License, from the @fontsource/rubik package) into the same six
 * paths, and says so loudly. That build compiles and runs, but it is NOT the
 * designed typography - never ship it, and never compare it against the
 * visual baseline.
 *
 * If all six licensed files are present this does nothing.
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.cwd(), "src/fonts");
const MARK = path.join(DIR, ".stand-in");
/* licensed file -> nearest Rubik weight */
const FILES = {
  "AlmoniNeue-Regular.otf": 400,
  "AlmoniNeue-Medium.otf": 500,
  "AlmoniNeue-Bold.otf": 700,
  "AlmoniNeue-Ultrabold.otf": 800,
  "AlmoniNeue-Black.otf": 900,
  "AlmoniNeue-Ultrablack.otf": 900,
};

const missing = Object.keys(FILES).filter((f) => !fs.existsSync(path.join(DIR, f)));

if (fs.existsSync(MARK)) {
  console.warn("\n  [fonts] STAND-IN FONT IN USE (Rubik). Not the designed typography. Delete src/fonts/ and copy the licensed Almoni Neue files in.\n");
} else if (missing.length === 0) {
  /* licensed files present - nothing to do */
} else {
  fs.mkdirSync(DIR, { recursive: true });
  const src = path.resolve(process.cwd(), "node_modules/@fontsource/rubik/files");
  /* only the missing ones - a licensed file that is present is never touched */
  for (const file of missing) {
    fs.copyFileSync(path.join(src, `rubik-hebrew-${FILES[file]}-normal.woff`), path.join(DIR, file));
  }
  fs.writeFileSync(MARK, "Rubik stand-in written by scripts/ensure-fonts.mjs\n");
  console.warn(
    `\n  [fonts] ${missing.length} licensed Almoni Neue file(s) missing from src/fonts/.` +
      "\n  [fonts] Wrote Rubik (OFL) as a STAND-IN so the build compiles. This is NOT the designed typography.\n"
  );
}
