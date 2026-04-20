import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTemplate, loadTemplate, render } from '../src/renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const templatesDir = path.join(repoRoot, 'templates');
const fontsDir = path.join(repoRoot, 'vendor', 'fonts');

async function resolveAndLoad(name) {
  const r = await resolveTemplate({ templatesDir, name });
  const fn = await loadTemplate(r);
  return fn;
}

test('engine=satori produces a valid PNG buffer', async () => {
  const tmpl = await resolveAndLoad('signpost-banner');
  const png = await render({
    template: tmpl,
    params: { title: 'satori path', subtitle: 'engine test' },
    width: 1200,
    height: 630,
    fontsDir,
    timeoutMs: 5000,
    engine: 'satori',
  });
  assert.equal(png[0], 0x89);  assert.equal(png[1], 0x50);
  assert.equal(png[2], 0x4e);  assert.equal(png[3], 0x47);
  assert.ok(png.length > 1000, `satori PNG too small: ${png.length}`);
});

test('engine=takumi produces a valid PNG buffer', async () => {
  const tmpl = await resolveAndLoad('signpost-banner');
  const png = await render({
    template: tmpl,
    params: { title: 'takumi path', subtitle: 'engine test' },
    width: 1200,
    height: 630,
    fontsDir,           // takumi ignores this; provided for parity
    timeoutMs: 5000,
    engine: 'takumi',
  });
  assert.equal(png[0], 0x89);  assert.equal(png[1], 0x50);
  assert.equal(png[2], 0x4e);  assert.equal(png[3], 0x47);
  assert.ok(png.length > 1000, `takumi PNG too small: ${png.length}`);
});

test('engine=takumi for a different template renders distinct output', async () => {
  // Same engine, different templates → distinct bytes (sanity check the
  // engine actually rendered the input rather than returning a stub).
  const t1 = await resolveAndLoad('signpost-banner');
  const t2 = await resolveAndLoad('blog-post-card');
  const png1 = await render({
    template: t1, params: { title: 'A' }, width: 1200, height: 630,
    fontsDir, timeoutMs: 5000, engine: 'takumi',
  });
  const png2 = await render({
    template: t2, params: { title: 'A', author: 'B', date: '2026', site: 'x' },
    width: 1200, height: 630, fontsDir, timeoutMs: 5000, engine: 'takumi',
  });
  assert.notDeepEqual(png1, png2);
});

test('engine=foo throws a clear error', async () => {
  const tmpl = await resolveAndLoad('signpost-banner');
  await assert.rejects(
    () => render({
      template: tmpl, params: { title: 'x' }, width: 1200, height: 630,
      fontsDir, timeoutMs: 5000, engine: 'made-up-engine',
    }),
    /unknown render engine/,
  );
});

test('engine default (omitted) behaves as satori', async () => {
  const tmpl = await resolveAndLoad('signpost-banner');
  const png = await render({
    template: tmpl, params: { title: 'default engine' },
    width: 1200, height: 630, fontsDir, timeoutMs: 5000,
    // engine intentionally omitted
  });
  assert.equal(png[0], 0x89);
  assert.ok(png.length > 1000);
});
