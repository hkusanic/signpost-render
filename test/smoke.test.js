import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTemplate, loadTemplate, render } from '../src/renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const templatesDir = path.join(repoRoot, 'templates');
const fontsDir = path.join(repoRoot, 'vendor', 'fonts');

test('signpost-banner template renders to a PNG', async () => {
  const resolved = await resolveTemplate({ templatesDir, name: 'signpost-banner' });
  const tmpl = await loadTemplate(resolved);
  const png = await render({
    template: tmpl,
    params: { title: 'Smoke test', subtitle: 'just verifying the pipeline' },
    width: 1200,
    height: 630,
    fontsDir,
    timeoutMs: 5000,
  });
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50);
  assert.equal(png[2], 0x4e);
  assert.equal(png[3], 0x47);
  assert.ok(png.length > 1000, `PNG too small: ${png.length} bytes`);
});

test('blog-post-card template renders to a PNG', async () => {
  const resolved = await resolveTemplate({ templatesDir, name: 'blog-post-card' });
  const tmpl = await loadTemplate(resolved);
  const png = await render({
    template: tmpl,
    params: { title: 'Hello', author: 'Alice', date: '2026-04-13', site: 'example.com' },
    width: 1200,
    height: 630,
    fontsDir,
    timeoutMs: 5000,
  });
  assert.equal(png[0], 0x89);
  assert.ok(png.length > 1000);
});

test('refuses template names with path traversal', async () => {
  await assert.rejects(
    () => resolveTemplate({ templatesDir, name: '../etc/passwd' }),
    /invalid characters/,
  );
});

test('returns 404-style error for missing template', async () => {
  await assert.rejects(
    () => resolveTemplate({ templatesDir, name: 'does-not-exist' }),
    /not found/,
  );
});
