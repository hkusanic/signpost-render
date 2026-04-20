import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const cliPath = path.join(repoRoot, 'src', 'cli.js');
const bannerTemplate = path.join(repoRoot, 'templates', 'signpost-banner.js');

function runCli(args, { input } = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on('data', (c) => stdoutChunks.push(c));
    child.stderr.on('data', (c) => stderrChunks.push(c));
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
    child.on('close', (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks).toString(),
      });
    });
  });
}

test('--help prints usage', async () => {
  const r = await runCli(['--help']);
  assert.equal(r.code, 0);
  assert.match(r.stdout.toString(), /USAGE/);
  assert.match(r.stdout.toString(), /signpost render/);
});

test('--version prints the package version', async () => {
  const r = await runCli(['--version']);
  assert.equal(r.code, 0);
  assert.match(r.stdout.toString(), /^signpost \d+\.\d+\.\d+/);
});

test('render writes a valid PNG to --out', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'signpost-cli-'));
  const outFile = path.join(dir, 'out.png');
  const r = await runCli([
    'render', bannerTemplate,
    '-p', 'title=Test render',
    '-p', 'subtitle=from the CLI tests',
    '-o', outFile,
  ]);
  assert.equal(r.code, 0, `cli failed: ${r.stderr}`);
  const s = await stat(outFile);
  assert.ok(s.size > 1000, `PNG unexpectedly small: ${s.size} bytes`);
  const bytes = await readFile(outFile);
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);
  assert.equal(bytes[2], 0x4e);
  assert.equal(bytes[3], 0x47);
  await unlink(outFile);
});

test('render to stdout emits a PNG', async () => {
  const r = await runCli([
    'render', bannerTemplate,
    '-p', 'title=Pipe me',
    '-w', '800', '-h', '420',
  ]);
  assert.equal(r.code, 0, `cli failed: ${r.stderr}`);
  assert.ok(r.stdout.length > 1000);
  assert.equal(r.stdout[0], 0x89);
  assert.equal(r.stdout[1], 0x50);
});

test('missing template argument returns non-zero', async () => {
  const r = await runCli(['render']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /missing template/);
});

test('nonexistent template returns non-zero with a clear error', async () => {
  const r = await runCli(['render', '/tmp/definitely-not-a-template-xyz.js']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /template not found/);
});

test('unknown flag returns non-zero', async () => {
  const r = await runCli(['render', bannerTemplate, '--unknown-flag']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /unknown flag/);
});

test('width out of bounds returns non-zero', async () => {
  const r = await runCli(['render', bannerTemplate, '-w', '99999']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /width must be/);
});

test('param without = returns non-zero', async () => {
  const r = await runCli(['render', bannerTemplate, '-p', 'bareword']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /--param expects key=value/);
});
