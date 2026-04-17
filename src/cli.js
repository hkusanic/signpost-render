#!/usr/bin/env node
// signpost — render a template locally to a PNG.
//
// Usage:
//   signpost render <template.js> [--param key=value]... [--width N] [--height N] [--out FILE]
//
// Examples:
//   signpost render templates/signpost-banner.js --param title='Hello HN' --out /tmp/hero.png
//   signpost render ./my-card.js -p title=Ship -p subtitle='2026-04-14' -w 800 -h 420 > card.png
//
// Useful for:
//   - Previewing a template before you push it to the Signpost-tracked repo.
//   - CI checks — build fails if a template can't render (`signpost render … > /dev/null`).
//   - Local iteration without running the full server.

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { render, HttpError } from './renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultFontsDir = path.resolve(here, '..', 'vendor', 'fonts');

async function main(argv) {
  const [cmd, ...rest] = argv.slice(2);

  if (!cmd || cmd === '-h' || cmd === '--help') {
    printHelp();
    return 0;
  }

  if (cmd === '--version' || cmd === '-V') {
    const pkg = JSON.parse(await fs.readFile(path.resolve(here, '..', 'package.json'), 'utf8'));
    console.log(`signpost ${pkg.version}`);
    return 0;
  }

  if (cmd !== 'render') {
    console.error(`error: unknown command '${cmd}'. try: signpost render --help`);
    return 2;
  }

  let templatePath = null;
  const params = {};
  let width = 1200;
  let height = 630;
  let outPath = null;
  let fontsDir = process.env.FONTS_DIR || defaultFontsDir;

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const next = () => {
      const v = rest[++i];
      if (v === undefined) throw new Error(`flag ${a} needs a value`);
      return v;
    };
    if (a === '-p' || a === '--param') {
      const eq = next();
      const idx = eq.indexOf('=');
      if (idx < 0) throw new Error(`--param expects key=value, got '${eq}'`);
      params[eq.slice(0, idx)] = eq.slice(idx + 1);
    } else if (a === '-w' || a === '--width') {
      width = Number.parseInt(next(), 10);
    } else if (a === '-h' || a === '--height') {
      height = Number.parseInt(next(), 10);
    } else if (a === '-o' || a === '--out') {
      outPath = next();
    } else if (a === '--fonts-dir') {
      fontsDir = next();
    } else if (a.startsWith('-')) {
      throw new Error(`unknown flag '${a}' — try: signpost render --help`);
    } else if (templatePath === null) {
      templatePath = a;
    } else {
      throw new Error(`unexpected positional argument '${a}'`);
    }
  }

  if (templatePath === null) {
    console.error('error: missing template path. try: signpost render <template.js> --help');
    return 2;
  }
  if (!Number.isFinite(width) || width < 1 || width > 4096) {
    throw new Error(`width must be 1..4096, got ${width}`);
  }
  if (!Number.isFinite(height) || height < 1 || height > 4096) {
    throw new Error(`height must be 1..4096, got ${height}`);
  }

  const absPath = path.resolve(templatePath);
  try {
    await fs.access(absPath);
  } catch {
    throw new Error(`template not found: ${templatePath}`);
  }

  // Import with a cache-busting query so re-running picks up template edits
  // without needing a fresh process.
  const stat = await fs.stat(absPath);
  const mod = await import(`${pathToFileURL(absPath).href}?v=${stat.mtimeNs ?? stat.mtime.getTime()}`);
  if (typeof mod.default !== 'function') {
    throw new Error(`${templatePath} must export default function (params) -> htmlString`);
  }

  const png = await render({
    template: mod.default,
    params,
    width,
    height,
    fontsDir,
    timeoutMs: 10_000,
  });

  if (outPath) {
    await fs.writeFile(outPath, png);
    process.stderr.write(`wrote ${png.length} bytes → ${outPath}\n`);
  } else if (process.stdout.isTTY) {
    throw new Error('refusing to write PNG to a TTY — use --out FILE or pipe to another command');
  } else {
    await new Promise((resolve, reject) => {
      process.stdout.write(png, (err) => (err ? reject(err) : resolve()));
    });
  }
  return 0;
}

function printHelp() {
  process.stdout.write(`signpost — render a Signpost template locally to PNG

USAGE
  signpost render <template.js> [flags]

FLAGS
  -p, --param KEY=VALUE   Template parameter. May be repeated.
  -w, --width N           Render width in pixels (default 1200).
  -h, --height N          Render height in pixels (default 630).
  -o, --out FILE          Write PNG to FILE. Without this, PNG is written to stdout.
      --fonts-dir DIR     Directory containing Inter-Regular.ttf + Inter-Bold.ttf.
                          Defaults to the bundled vendor/fonts.

EXAMPLES
  signpost render templates/signpost-banner.js \\
    -p title='Hello HN' -p subtitle='from a mini PC' \\
    -o /tmp/hero.png

  # As a CI check: render to /dev/null and fail non-zero on template errors.
  signpost render ./my-card.js -p title=Ship > /dev/null
`);
}

main(process.argv).then(
  (code) => process.exit(code),
  (err) => {
    if (err instanceof HttpError) process.stderr.write(`error: ${err.message}\n`);
    else process.stderr.write(`error: ${err.message ?? err}\n`);
    process.exit(1);
  },
);
