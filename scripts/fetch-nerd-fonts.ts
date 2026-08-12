/**
 * Fetches the pinned Nerd Fonts release, verifies SHA256 checksums, converts
 * TTFs to woff2 (via a gitignored Python venv with fontTools), and writes the
 * fonts plus a generated `@font-face` stylesheet into `src/assets/nerd-fonts/`.
 *
 * Usage:
 *   bun run fonts:fetch          # download if needed, verify, convert
 *   bun run fonts:fetch --force  # ignore existing output, re-fetch everything
 *   bun run fonts:fetch --check  # fail fast if output is missing or stale
 *
 * Bump procedure: edit VERSION, replace each sha256 with `shasum -a 256 <file>`
 * output for the new TTFs, then run `bun run fonts:fetch --force`.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const VERSION = "v3.5.0";
const BASE = `https://raw.githubusercontent.com/ryanoasis/nerd-fonts/${VERSION}/patched-fonts`;

const OUT_DIR = path.resolve(import.meta.dir, "../src/assets/nerd-fonts");
const STATE_FILE = path.join(OUT_DIR, ".fetch-state.json");
const CSS_FILE = path.join(OUT_DIR, "nerd-fonts.css");
const VENV_DIR = path.resolve(import.meta.dir, "../.fonts-venv");

interface FontFile {
  /** Output woff2 filename (also used as the cache key). */
  name: string;
  /** Repo-relative path of the source TTF. */
  src: string;
  /** CSS font-weight this file backs. */
  weight: number;
  /** Pinned SHA256 of the source TTF. */
  sha256: string;
}

interface Family {
  id: string;
  /** CSS font-family name (declared in @font-face, used by xterm stacks). */
  family: string;
  files: FontFile[];
}

/** Families without SemiBold ship Regular + Bold (700) instead of 600. */
const FAMILIES: Family[] = [
  {
    id: "fira-code",
    family: "FiraCode Nerd Font Mono",
    files: [
      { name: "FiraCodeNerdFontMono-Regular.woff2", src: "FiraCode/FiraCodeNerdFontMono-Regular.ttf", weight: 400, sha256: "26541bcfc75cd030aeeae9d7e24211be32f1fe7c6c9ceaa05c94759d1bb9ba0c" },
      { name: "FiraCodeNerdFontMono-SemiBold.woff2", src: "FiraCode/FiraCodeNerdFontMono-SemiBold.ttf", weight: 600, sha256: "cd5c8499034c30f0973f560b814d366ba1c12823bb2153d9b2ec5d740e841b82" },
    ],
  },
  {
    id: "jetbrains-mono",
    family: "JetBrainsMono Nerd Font Mono",
    files: [
      { name: "JetBrainsMonoNerdFontMono-Regular.woff2", src: "JetBrainsMono/Ligatures/JetBrainsMonoNerdFontMono-Regular.ttf", weight: 400, sha256: "474634cb9b0697a3a10b3da589e896794e1128b0c7c9b49678ec2e03194ce45a" },
      { name: "JetBrainsMonoNerdFontMono-SemiBold.woff2", src: "JetBrainsMono/Ligatures/JetBrainsMonoNerdFontMono-SemiBold.ttf", weight: 600, sha256: "da0f5f8adfa4e8357441d5d01df0de0a9df69512fc25708ee0e3d38d11cd9f9d" },
    ],
  },
  {
    id: "blex-mono",
    family: "BlexMono Nerd Font Mono",
    files: [
      { name: "BlexMonoNerdFontMono-Regular.woff2", src: "IBMPlexMono/Mono/BlexMonoNerdFontMono-Regular.ttf", weight: 400, sha256: "a235dc1e3126a7c459394734f487e99f52046bdb4ec34f05094b404bec7a721a" },
      { name: "BlexMonoNerdFontMono-SemiBold.woff2", src: "IBMPlexMono/Mono/BlexMonoNerdFontMono-SemiBold.ttf", weight: 600, sha256: "684128cb1a8f87cccaecb57c31599e481f0cc8bbe38311d31d30fc12e8df37c3" },
    ],
  },
  {
    id: "sauce-code-pro",
    family: "SauceCodePro Nerd Font Mono",
    files: [
      { name: "SauceCodeProNerdFontMono-Regular.woff2", src: "SourceCodePro/SauceCodeProNerdFontMono-Regular.ttf", weight: 400, sha256: "52b7b73de0ae6150695cb0a0b06e91423a150090ce004fc405b6c9f51ce15386" },
      { name: "SauceCodeProNerdFontMono-SemiBold.woff2", src: "SourceCodePro/SauceCodeProNerdFontMono-SemiBold.ttf", weight: 600, sha256: "f01e7a0417c9660ccde173d4aef2f52369871d889bf5ac566184021c70a6ca5c" },
    ],
  },
  {
    id: "go-mono",
    family: "GoMono Nerd Font Mono",
    files: [
      { name: "GoMonoNerdFontMono-Regular.woff2", src: "Go-Mono/GoMonoNerdFontMono-Regular.ttf", weight: 400, sha256: "f7483d8ecd20387dcc820abdf0e3a8010e52c7a0ff59e7f4507645099ebb4275" },
      { name: "GoMonoNerdFontMono-Bold.woff2", src: "Go-Mono/GoMonoNerdFontMono-Bold.ttf", weight: 700, sha256: "0ac4364469e1b7b9edbcf18426f1e95d6e98420f5f3d774d6b10a861a58041b8" },
    ],
  },
  {
    id: "ubuntu-mono",
    family: "UbuntuMono Nerd Font Mono",
    files: [
      { name: "UbuntuMonoNerdFontMono-Regular.woff2", src: "UbuntuMono/UbuntuMonoNerdFontMono-Regular.ttf", weight: 400, sha256: "76ca027faafcf7d79f80b782f8c2baf4df334e8611a6d2f57282a9a8cc5b16a2" },
      { name: "UbuntuMonoNerdFontMono-Bold.woff2", src: "UbuntuMono/UbuntuMonoNerdFontMono-Bold.ttf", weight: 700, sha256: "b3a0396e7ff584b4c2bfca215a1e9ae3d612b100a75ad01c0ac50e7260d3dbb3" },
    ],
  },
  {
    id: "dejavu-sans-mono",
    family: "DejaVuSansMono Nerd Font Mono",
    files: [
      { name: "DejaVuSansMNerdFontMono-Regular.woff2", src: "DejaVuSansMono/DejaVuSansMNerdFontMono-Regular.ttf", weight: 400, sha256: "1c28591521ea408191dfafcd7a27abf60b698bf9d5024ee2a38d257acb47766e" },
      { name: "DejaVuSansMNerdFontMono-Bold.woff2", src: "DejaVuSansMono/DejaVuSansMNerdFontMono-Bold.ttf", weight: 700, sha256: "839f51a128f21c4196a54f552175a551b8ac18a53ce53768b9488d30605c1264" },
    ],
  },
  {
    id: "terminess",
    family: "Terminess Nerd Font Mono",
    files: [
      { name: "TerminessNerdFontMono-Regular.woff2", src: "Terminus/TerminessNerdFontMono-Regular.ttf", weight: 400, sha256: "93b2a0899cf266f37f8e459b37273c2cd6497fa17fbe60cfa0cadd6cdd0856bc" },
      { name: "TerminessNerdFontMono-Bold.woff2", src: "Terminus/TerminessNerdFontMono-Bold.ttf", weight: 700, sha256: "5abdb6169b5a5b5942cd21106f2824a16ca0e40c85c4cb3325e9e25e937208aa" },
    ],
  },
];

const ALL_FILES = FAMILIES.flatMap((f) => f.files);

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function log(msg: string): void {
  console.log(`[fonts] ${msg}`);
}

/** A fetch-state entry keyed by output filename → pinned source sha256. */
function buildState(): Record<string, string> {
  const state: Record<string, string> = {};
  for (const f of ALL_FILES) state[f.name] = f.sha256;
  return state;
}

function readState(): Record<string, string> | null {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** True when every woff2 exists and the recorded state matches the manifest. */
function isUpToDate(): boolean {
  const state = readState();
  if (!state) return false;
  const expected = buildState();
  if (JSON.stringify(state) !== JSON.stringify(expected)) return false;
  return ALL_FILES.every((f) => existsSync(path.join(OUT_DIR, f.name)));
}

/** Ensure the gitignored venv exists with fontTools + brotli. */
function ensureVenv(): string {
  const isWin = process.platform === "win32";
  const python = isWin ? "python" : "python3";
  const venvPython = path.join(VENV_DIR, isWin ? "Scripts/python.exe" : "bin/python");

  if (!existsSync(venvPython)) {
    log(`creating Python venv at ${VENV_DIR}`);
    execFileSync(python, ["-m", "venv", VENV_DIR], { stdio: "inherit" });
  }

  try {
    execFileSync(venvPython, ["-c", "import fontTools, brotli"], { stdio: "pipe" });
  } catch {
    log("installing fontTools + brotli into venv");
    execFileSync(venvPython, ["-m", "pip", "install", "fonttools", "brotli"], { stdio: "inherit" });
  }

  return venvPython;
}

/** Convert a TTF to woff2 via fontTools. */
function convertToWoff2(venvPython: string, ttfPath: string, woff2Path: string): void {
  execFileSync(venvPython, ["-m", "fontTools.ttLib.woff2", "compress", ttfPath, "-o", woff2Path], {
    stdio: "pipe",
  });
}

function generateCss(): string {
  const lines = ["/* Generated by scripts/fetch-nerd-fonts.ts — do not edit. */"];
  for (const family of FAMILIES) {
    for (const f of family.files) {
      lines.push(
        `@font-face {`,
        `  font-family: "${family.family}";`,
        `  src: url("./${f.name}") format("woff2");`,
        `  font-weight: ${f.weight};`,
        `  font-style: normal;`,
        `  font-display: swap;`,
        `}`,
      );
    }
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const checkOnly = args.includes("--check");

  if (checkOnly) {
    if (isUpToDate()) {
      log("fonts up to date");
      process.exit(0);
    }
    log("fonts missing or stale — run `bun run fonts:fetch`");
    process.exit(1);
  }

  if (isUpToDate() && !force) {
    log("fonts already fetched and verified — skipping (use --force to re-fetch)");
    return;
  }

  const venvPython = ensureVenv();
  await mkdir(OUT_DIR, { recursive: true });

  const tmpDir = path.join(OUT_DIR, ".tmp");
  await mkdir(tmpDir, { recursive: true });

  try {
    for (const f of ALL_FILES) {
      const outPath = path.join(OUT_DIR, f.name);
      const url = `${BASE}/${f.src}`;
      const tmpTtf = path.join(tmpDir, f.name.replace(/\.woff2$/, ".ttf"));

      log(`fetching ${f.name}…`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed (${res.status}) for ${url}`);
      const ttf = Buffer.from(await res.arrayBuffer());

      const actual = sha256(ttf);
      if (actual !== f.sha256) {
        throw new Error(
          `checksum mismatch for ${f.name}:\n  expected ${f.sha256}\n  actual   ${actual}\n` +
            `Refusing to write output — possible tampered or mutated upstream file.`,
        );
      }

      writeFileSync(tmpTtf, ttf);
      convertToWoff2(venvPython, tmpTtf, outPath);
      rmSync(tmpTtf);
      log(`converted ${f.name} (${(ttf.length / 1024 / 1024).toFixed(1)} MB TTF → ${((await readFile(outPath)).length / 1024 / 1024).toFixed(1)} MB woff2)`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  writeFileSync(STATE_FILE, JSON.stringify(buildState(), null, 2));
  writeFileSync(CSS_FILE, generateCss());
  log(`wrote ${ALL_FILES.length} woff2 + nerd-fonts.css to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(`[fonts] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
