import { test } from 'node:test';
import assert from 'node:assert/strict';
import { records } from '../../src/findings.js';
import snapshot from '../../src/snapshot.js';

test('records are numeric statements with a link, and say nothing else', () => {
  const list = records(snapshot);
  assert.ok(list.length >= 10);
  for (const r of list) {
    assert.match(r.text, /\d/, r.text);
    assert.match(r.href, /^https:\/\//, r.text);
    assert.ok(r.text.length <= 160, r.text);
    assert.doesNotMatch(r.text, /NaN|undefined|null|Infinity/, r.text);
    assert.doesNotMatch(r.text, /\b(only|just|mere|merely|staggering|shocking|surprising|remarkabl\w*|astonishing)\b/i, r.text);
  }
});

test('records include the largest idle year and the deadliest coal year', () => {
  const text = records(snapshot).map((r) => r.text).join('\n');
  assert.match(text, /1946: 116,000,000 days idle/);
  assert.match(text, /1907: 3,242 coal miners killed/);
});
