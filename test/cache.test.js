import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryLRU, cacheKey } from '../src/cache.js';

test('MemoryLRU returns null for missing keys', () => {
  const lru = new MemoryLRU({ max: 3 });
  assert.equal(lru.get('nope'), null);
});

test('MemoryLRU returns inserted values', () => {
  const lru = new MemoryLRU({ max: 3 });
  lru.set('a', Buffer.from('hello'));
  assert.equal(lru.get('a').toString(), 'hello');
});

test('MemoryLRU evicts oldest when over capacity', () => {
  const lru = new MemoryLRU({ max: 2 });
  lru.set('a', 1);
  lru.set('b', 2);
  lru.set('c', 3);            // evicts 'a'
  assert.equal(lru.get('a'), null);
  assert.equal(lru.get('b'), 2);
  assert.equal(lru.get('c'), 3);
  assert.equal(lru.size, 2);
});

test('MemoryLRU touches entries on get (true LRU semantics)', () => {
  const lru = new MemoryLRU({ max: 2 });
  lru.set('a', 1);
  lru.set('b', 2);
  lru.get('a');               // 'a' is now most-recent
  lru.set('c', 3);            // evicts 'b', not 'a'
  assert.equal(lru.get('a'), 1);
  assert.equal(lru.get('b'), null);
  assert.equal(lru.get('c'), 3);
});

test('cacheKey is stable regardless of param key order', () => {
  const a = cacheKey({
    templatePath: '/tpl/foo.js',
    templateMtimeNs: 12345n,
    params: { title: 'a', author: 'b', date: '2026' },
    width: 1200,
    height: 630,
  });
  const b = cacheKey({
    templatePath: '/tpl/foo.js',
    templateMtimeNs: 12345n,
    params: { date: '2026', author: 'b', title: 'a' },
    width: 1200,
    height: 630,
  });
  assert.equal(a, b);
});

test('cacheKey changes when any input changes', () => {
  const base = {
    templatePath: '/tpl/foo.js',
    templateMtimeNs: 12345n,
    params: { title: 'a' },
    width: 1200,
    height: 630,
  };
  const k = cacheKey(base);
  assert.notEqual(k, cacheKey({ ...base, templateMtimeNs: 12346n }));
  assert.notEqual(k, cacheKey({ ...base, params: { title: 'b' } }));
  assert.notEqual(k, cacheKey({ ...base, width: 1201 }));
  assert.notEqual(k, cacheKey({ ...base, templatePath: '/tpl/bar.js' }));
});
