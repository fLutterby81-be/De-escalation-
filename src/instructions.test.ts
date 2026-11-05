import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseIntensity, instructions, pickInstruction, type Intensity } from './instructions';

test('chooseIntensity follows pace and momentum', () => {
  assert.equal(chooseIntensity(10_000, 0), 'tiny', 'first step is always tiny');
  assert.equal(chooseIntensity(1_000, 8), 'tiny', 'fast clicking means panic');
  assert.equal(chooseIntensity(30_000, 8), 'tiny', 'long wait means freeze');
  assert.equal(chooseIntensity(10_000, 3), 'gentle', 'steady pace, just started');
  assert.equal(chooseIntensity(10_000, 6), 'active', 'steady pace with momentum');
});

test('pickInstruction never repeats a recent instruction', () => {
  const recent = instructions.nl.tiny.slice(0, 4);
  for (let i = 0; i < 200; i++) {
    const picked = pickInstruction('nl', 'tiny', recent);
    assert.ok(instructions.nl.tiny.includes(picked));
    assert.ok(!recent.includes(picked));
  }
});

test('pickInstruction still avoids the last one when everything is recent', () => {
  const pool = instructions.en.gentle;
  const recent = [pool[0], ...pool.slice(1)];
  for (let i = 0; i < 50; i++) {
    assert.notEqual(pickInstruction('en', 'gentle', recent), pool[0]);
  }
});

test('the library follows the instruction rules', () => {
  for (const language of ['nl', 'en'] as const) {
    for (const intensity of ['tiny', 'gentle', 'active'] as Intensity[]) {
      const pool = instructions[language][intensity];
      assert.equal(pool.length, instructions.nl[intensity].length, `${language}/${intensity} matches nl size`);
      assert.equal(new Set(pool).size, pool.length, `${language}/${intensity} has no duplicates`);
      for (const item of pool) {
        assert.ok(!item.includes('?'), `no questions: ${item}`);
        assert.ok((item.match(/[.!]/g) ?? []).length <= 2, `max two sentences: ${item}`);
      }
    }
  }
});
