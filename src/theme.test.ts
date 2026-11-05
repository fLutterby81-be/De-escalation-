import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNight, resolveTheme } from './theme';

const at = (hour: number, minute = 0) => new Date(2026, 10, 5, hour, minute);

test('isNight covers 21:00 up to 07:00', () => {
  assert.equal(isNight(at(20, 59)), false);
  assert.equal(isNight(at(21, 0)), true);
  assert.equal(isNight(at(0, 30)), true);
  assert.equal(isNight(at(6, 59)), true);
  assert.equal(isNight(at(7, 0)), false);
  assert.equal(isNight(at(14, 0)), false);
});

test('resolveTheme is dark at night or when the device prefers dark', () => {
  assert.equal(resolveTheme(false, at(12)), 'light');
  assert.equal(resolveTheme(false, at(23)), 'dark');
  assert.equal(resolveTheme(true, at(12)), 'dark');
  assert.equal(resolveTheme(true, at(23)), 'dark');
});
