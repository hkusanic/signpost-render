import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import satori from 'satori';
import { html as satoriHTML } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';

let fontsPromise = null;

async function loadFonts(fontsDir) {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    const [regular, bold] = await Promise.all([
      fs.readFile(path.join(fontsDir, 'Inter-Regular.ttf')),
      fs.readFile(path.join(fontsDir, 'Inter-Bold.ttf')),
    ]);
    return [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ];
  })();
  // Self-heal on failure: if the first load ever rejects (missing font,
  // bad permissions on the volume, etc.) drop the cached promise so the
  // next call gets to retry. Without this, one transient disk hiccup at
  // startup wedges every subsequent render forever until pod restart.
  fontsPromise.catch(() => { fontsPromise = null; });
  return fontsPromise;
}

// Resolve and validate a template path. Refuses anything that escapes
// templatesDir — even ../ tricks behind URL-encoding.
export async function resolveTemplate({ templatesDir, name }) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    throw new HttpError(400, `template name has invalid characters: ${name}`);
  }
  const candidate = path.resolve(templatesDir, `${name}.js`);
  if (!candidate.startsWith(path.resolve(templatesDir) + path.sep)) {
    throw new HttpError(400, `template path escapes templatesDir`);
  }
  let stat;
  try {
    stat = await fs.stat(candidate);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new HttpError(404, `template not found: ${name}.js`);
    }
    throw err;
  }
  if (!stat.isFile()) {
    throw new HttpError(404, `template is not a file: ${name}.js`);
  }
  return { path: candidate, mtimeNs: stat.mtimeNs };
}

// Import a template module from disk. Cache-busted by mtime so editing the
// file picks up live without restarting the process.
export async function loadTemplate({ path: filePath, mtimeNs }) {
  const url = pathToFileURL(filePath).href + `?v=${mtimeNs}`;
  const mod = await import(url);
  if (typeof mod.default !== 'function') {
    throw new HttpError(500, `template ${filePath} must export default function (params) -> html string`);
  }
  return mod.default;
}

// Lazy import — keeps takumi-js out of the cold-start path when running
// with the satori engine. The dynamic import only fires once, on the
// first takumi render, then memoizes.
let takumiPromise = null;
async function getTakumiRender() {
  if (takumiPromise) return takumiPromise;
  takumiPromise = (async () => {
    try {
      const mod = await import('takumi-js');
      return mod.render;
    } catch (err) {
      throw new HttpError(
        500,
        `RENDER_ENGINE=takumi requested but takumi-js is not installed: ${err.message}`,
      );
    }
  })();
  return takumiPromise;
}

// Engine-agnostic facade. The element-tree input is shared between both
// engines (satori-html parses the template's HTML once); the rendering
// step branches on `engine`. Output is always a Node Buffer holding PNG.
export async function render({
  template,
  params,
  width,
  height,
  fontsDir,
  timeoutMs,
  engine = 'satori',
}) {
  const htmlString = await runWithTimeout(() => template(params), timeoutMs, 'template-fn');
  if (typeof htmlString !== 'string') {
    throw new HttpError(500, 'template returned a non-string; expected an HTML string');
  }
  const element = satoriHTML(htmlString);

  if (engine === 'takumi') {
    const takumiRender = await getTakumiRender();
    const png = await runWithTimeout(
      () => takumiRender(element, { width, height }),
      timeoutMs,
      'takumi',
    );
    // takumi-js returns a Uint8Array; wrap so callers reliably get a Buffer.
    return Buffer.isBuffer(png) ? png : Buffer.from(png);
  }

  if (engine === 'satori') {
    const fonts = await loadFonts(fontsDir);
    const svg = await runWithTimeout(
      () => satori(element, { width, height, fonts }),
      timeoutMs,
      'satori',
    );
    return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  }

  throw new HttpError(500, `unknown render engine: ${engine}; expected "satori" or "takumi"`);
}

function runWithTimeout(fn, ms, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new HttpError(504, `${label} exceeded ${ms}ms timeout`));
    }, ms);
    Promise.resolve()
      .then(fn)
      .then((v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
