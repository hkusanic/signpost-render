import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const env = process.env;

export const config = Object.freeze({
  port: Number(env.PORT ?? 8080),
  host: env.HOST ?? '0.0.0.0',

  // Where templates live. Mount a volume here in production; default points at
  // the repo's own templates/ directory so `npm start` works out of the box.
  templatesDir: env.TEMPLATES_DIR ?? path.resolve(here, '..', 'templates'),

  // Where rendered PNGs are cached. Should be on a volume in production.
  cacheDir: env.CACHE_DIR ?? path.resolve(here, '..', '.cache'),

  // Maximum cache size in bytes (default 256 MiB). Oldest entries evicted first.
  cacheMaxBytes: Number(env.CACHE_MAX_BYTES ?? 256 * 1024 * 1024),

  // Where the bundled fonts live.
  fontsDir: env.FONTS_DIR ?? path.resolve(here, '..', 'vendor', 'fonts'),

  // Default render dimensions. Per-template overrides via ?w=&h=.
  defaultWidth: Number(env.DEFAULT_WIDTH ?? 1200),
  defaultHeight: Number(env.DEFAULT_HEIGHT ?? 630),

  // Wall-clock per-render timeout in ms. Satori is fast, but a malicious
  // template can run arbitrary JS — fail loudly rather than block forever.
  renderTimeoutMs: Number(env.RENDER_TIMEOUT_MS ?? 5000),

  // L1 in-memory cache size (item count, not bytes). At ~50KB/PNG average,
  // 200 items is ~10MB resident — well under any sane container limit.
  memoryCacheItems: Number(env.MEMORY_CACHE_ITEMS ?? 200),

  // Reject URLs longer than this (header-line / query-string DoS hardening).
  // 4KB is generous for legitimate use; anything larger is fuzzing.
  maxUrlBytes: Number(env.MAX_URL_BYTES ?? 4096),

  // Render engine — "satori" or "takumi". Satori is the v0.1/0.2 default
  // (Vercel's, JS-with-native-resvg, well-trodden). Takumi is the v0.3+
  // option (all-Rust, ~1.5× faster in-pod, 30% smaller PNG output, drop-in
  // compatible with our element-tree input). Verified by
  // research/render-engine-benchmark-2026-04-15.md. Default stays satori
  // for one release cycle to keep the rollout boring; switch to takumi
  // via env once you've shadow-validated outputs in your environment.
  renderEngine: (env.RENDER_ENGINE ?? 'satori').toLowerCase(),
});
