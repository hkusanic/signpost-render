import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { DiskCache, MemoryLRU, cacheKey } from './cache.js';
import { resolveTemplate, loadTemplate, render, HttpError } from './renderer.js';

const diskCache = new DiskCache({ dir: config.cacheDir, maxBytes: config.cacheMaxBytes });
await diskCache.init();

// L1 in-memory cache → L2 disk → render. Hot keys hit microseconds; warm keys
// hit ~1ms; cold keys go through the full render pipeline.
const memCache = new MemoryLRU({ max: config.memoryCacheItems });

// Cache-stampede guard: if N concurrent requests arrive for the same cold
// key, only the first one renders; the rest await its resolution. Without
// this, an HN-tweet spike produces N parallel Satori runs for the same URL
// and saturates CPU at a multiple of the miss-rate ceiling. Map is keyed
// by the same sha256 digest used for the cache.
const inFlight = new Map();

// Periodic disk-LRU sweep so the disk doesn't grow forever. Runs every 10 min,
// not on the hot path. unref() so it doesn't keep the process alive on its own.
setInterval(() => {
  diskCache.sweep().catch((err) => console.error('cache sweep failed:', err));
}, 10 * 60 * 1000).unref();

const app = new Hono();

app.get('/healthz', (c) => c.text('ok\n'));

// Reject pathological URLs early. Saves a template-resolve syscall on
// random fuzzing traffic.
app.use('/render/*', async (c, next) => {
  if (c.req.url.length > config.maxUrlBytes) {
    return c.text(`414: URL too long (>${config.maxUrlBytes} bytes)\n`, 414);
  }
  return next();
});

const handleRender = async (c) => {
  const start = Date.now();
  const name = c.req.param('template');
  const query = c.req.query();

  const width = clampInt(query.w, 1, 4096) ?? config.defaultWidth;
  const height = clampInt(query.h, 1, 4096) ?? config.defaultHeight;

  const params = { ...query };
  delete params.w;
  delete params.h;

  let resolved;
  try {
    resolved = await resolveTemplate({ templatesDir: config.templatesDir, name });
  } catch (err) {
    return errorResponse(c, err);
  }

  const key = cacheKey({
    templatePath: resolved.path,
    templateMtimeNs: resolved.mtimeNs,
    params,
    width,
    height,
  });

  // Conditional GET: same key → identical bytes → 304.
  // Crawlers cache aggressively; honour their If-None-Match.
  const ifNoneMatch = c.req.header('if-none-match');
  if (ifNoneMatch && etagMatches(ifNoneMatch, key)) {
    return notModifiedResponse(c, key, 'hit-l1', Date.now() - start);
  }

  let png = memCache.get(key);
  let cacheStatus = png ? 'hit-l1' : null;

  if (!png) {
    png = await diskCache.get(key);
    if (png) {
      cacheStatus = 'hit-l2';
      memCache.set(key, png);
    }
  }

  if (!png) {
    cacheStatus = 'miss';
    // Stampede guard: one pending render per key. Followers await the
    // leader's Promise; everyone gets the same bytes; leader persists to
    // disk exactly once. If the leader's render rejects, followers get
    // the same rejection and each re-enters the miss path on retry.
    let pending = inFlight.get(key);
    if (!pending) {
      pending = (async () => {
        const tmpl = await loadTemplate(resolved);
        const bytes = await render({
          template: tmpl,
          params,
          width,
          height,
          fontsDir: config.fontsDir,
          timeoutMs: config.renderTimeoutMs,
          engine: config.renderEngine,
        });
        memCache.set(key, bytes);
        diskCache.set(key, bytes).catch((err) => console.error('cache write failed:', err));
        return bytes;
      })();
      inFlight.set(key, pending);
      pending.finally(() => inFlight.delete(key));
    } else {
      // This caller did not initiate the render; tag its cache-status so
      // operators can see coalescing working in the x-signpost-cache header.
      cacheStatus = 'miss-coalesced';
    }
    try {
      png = await pending;
    } catch (err) {
      return errorResponse(c, err);
    }
  }

  const elapsed = Date.now() - start;
  c.header('content-type', 'image/png');
  c.header('cache-control', 'public, max-age=86400, immutable');
  c.header('etag', etagFor(key));
  c.header('x-signpost-cache', cacheStatus);
  c.header('x-signpost-render-ms', String(elapsed));
  // HEAD requests get headers only; many social-preview bots HEAD before GET.
  if (c.req.method === 'HEAD') {
    c.header('content-length', String(png.length));
    return c.body(null);
  }
  return c.body(png);
};

app.get('/render/:template', handleRender);
app.on('HEAD', '/render/:template', handleRender);

app.notFound((c) => c.text('not found\n', 404));

function clampInt(raw, min, max) {
  if (raw === undefined) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function etagFor(key) {
  // Strong ETag: the cache key is a sha256 hex; that already uniquely
  // identifies the bytes. Wrap in quotes per RFC 9110 §8.8.3.
  return `"${key}"`;
}

function etagMatches(ifNoneMatch, key) {
  // Tolerate "*" wildcards and weak/strong markers in client headers.
  return ifNoneMatch.split(',').some((tag) => {
    const t = tag.trim().replace(/^W\//, '');
    return t === '*' || t === etagFor(key);
  });
}

function notModifiedResponse(c, key, cacheStatus, elapsed) {
  c.header('etag', etagFor(key));
  c.header('cache-control', 'public, max-age=86400, immutable');
  c.header('x-signpost-cache', cacheStatus);
  c.header('x-signpost-render-ms', String(elapsed));
  return c.body(null, 304);
}

function errorResponse(c, err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error('render error:', err);
  return c.text(`${status}: ${err.message}\n`, status);
}

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`signpost-render listening on http://${info.address}:${info.port}`);
  console.log(`  renderEngine: ${config.renderEngine}`);
  console.log(`  templatesDir: ${config.templatesDir}`);
  console.log(`  cacheDir:     ${config.cacheDir}`);
  console.log(`  memoryCacheItems: ${config.memoryCacheItems}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`received ${sig}, shutting down`);
    server.close(() => process.exit(0));
  });
}
