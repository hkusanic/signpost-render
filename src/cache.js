import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// Hash inputs deterministically. Same inputs → same key, no matter the JS
// engine's hash-key ordering or stringification quirks (we sort first).
export function cacheKey({ templatePath, templateMtimeNs, params, width, height }) {
  const sortedParams = JSON.stringify(
    Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b))),
  );
  const hash = createHash('sha256');
  hash.update(templatePath);
  hash.update('\0');
  hash.update(String(templateMtimeNs));
  hash.update('\0');
  hash.update(sortedParams);
  hash.update('\0');
  hash.update(`${width}x${height}`);
  return hash.digest('hex');
}

// Tiny LRU on top of the disk cache. Keeps the N most-recent PNGs in RAM so
// repeat hits skip the syscall cost. Bounded by item count, not bytes — at
// 50KB/PNG average and the default 200 entries that's ~10MB resident, far
// under any sane container limit.
export class MemoryLRU {
  constructor({ max = 200 } = {}) {
    this.max = max;
    this.map = new Map();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    // Reinsert to mark most-recently-used (Map iteration order is insertion order).
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
  get size() { return this.map.size; }
}

export class DiskCache {
  constructor({ dir, maxBytes }) {
    this.dir = dir;
    this.maxBytes = maxBytes;
    this.accessed = new Map();
  }

  async init() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  pathFor(key) {
    // Two-byte fanout keeps any single directory under a few thousand entries
    // even with millions of total renders.
    return path.join(this.dir, key.slice(0, 2), `${key}.png`);
  }

  async get(key) {
    try {
      const data = await fs.readFile(this.pathFor(key));
      this.accessed.set(key, Date.now());
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async set(key, data) {
    const target = this.pathFor(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    // Unique tmp path per writer — pid alone is not enough if the same pid
    // writes the same key twice concurrently (e.g., after a future pool of
    // workers, or just a retry from the coalescing path in server.js).
    // randomUUID gives us a per-attempt suffix so concurrent writers never
    // collide on the tmp file itself.
    const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, target);
    } catch (err) {
      // Clean up the tmp if writeFile succeeded but rename failed (or any
      // other partial state). Swallow cleanup errors — the original err is
      // what the caller needs.
      await fs.unlink(tmp).catch(() => {});
      throw err;
    }
  }

  // Walk the cache, drop oldest entries until we're under maxBytes.
  // Cheap to call from a periodic sweep; not on the hot path.
  async sweep() {
    const entries = [];
    const stack = [this.dir];
    while (stack.length) {
      const dir = stack.pop();
      let names;
      try {
        names = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (err.code === 'ENOENT') continue;
        throw err;
      }
      for (const name of names) {
        const full = path.join(dir, name.name);
        if (name.isDirectory()) {
          stack.push(full);
        } else if (name.isFile() && full.endsWith('.png')) {
          const stat = await fs.stat(full);
          const key = path.basename(full, '.png');
          const lastAccess = this.accessed.get(key) ?? stat.atimeMs;
          entries.push({ full, key, size: stat.size, atimeMs: lastAccess });
        }
      }
    }
    let total = entries.reduce((acc, e) => acc + e.size, 0);
    if (total <= this.maxBytes) return { kept: entries.length, dropped: 0, bytes: total };
    entries.sort((a, b) => a.atimeMs - b.atimeMs);
    let dropped = 0;
    while (total > this.maxBytes && entries.length) {
      const e = entries.shift();
      await fs.unlink(e.full).catch(() => {});
      this.accessed.delete(e.key);
      total -= e.size;
      dropped += 1;
    }
    return { kept: entries.length, dropped, bytes: total };
  }
}
