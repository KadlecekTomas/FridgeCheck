import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyExpiryDate,
  daysUntilExpiry,
  parseExpiryDate,
  resolveExpiringDays,
} from './expiry.ts'

test('an item expiring today remains expiring for the whole calendar day', () => {
  const lateToday = new Date(2026, 7, 17, 23, 59, 59, 999)

  assert.equal(daysUntilExpiry('2026-08-17', lateToday), 0)
  assert.equal(classifyExpiryDate('2026-08-17', 3, lateToday), 'expiring')
})

test('an item becomes expired on the following calendar day', () => {
  const nextDay = new Date(2026, 7, 18, 0, 0, 0, 1)

  assert.equal(daysUntilExpiry('2026-08-17', nextDay), -1)
  assert.equal(classifyExpiryDate('2026-08-17', 3, nextDay), 'expired')
})

test('the expiring-soon boundary is inclusive', () => {
  const now = new Date(2026, 7, 17, 12, 0, 0)

  assert.equal(classifyExpiryDate('2026-08-20', 3, now), 'expiring')
  assert.equal(classifyExpiryDate('2026-08-21', 3, now), 'ok')
})

test('calendar-day arithmetic ignores the current time of day', () => {
  const lateMonthEnd = new Date(2026, 7, 31, 23, 59, 59)

  assert.equal(daysUntilExpiry('2026-09-01', lateMonthEnd), 1)
})

test('zero-day threshold only treats today as expiring', () => {
  const now = new Date(2026, 7, 17, 8, 0, 0)

  assert.equal(classifyExpiryDate('2026-08-17', 0, now), 'expiring')
  assert.equal(classifyExpiryDate('2026-08-18', 0, now), 'ok')
})

test('date-only parsing creates the expected local calendar date', () => {
  const parsed = parseExpiryDate('2028-02-29')

  assert.equal(parsed.getFullYear(), 2028)
  assert.equal(parsed.getMonth(), 1)
  assert.equal(parsed.getDate(), 29)
})

test('invalid calendar dates fail instead of being silently normalized', () => {
  assert.throws(() => classifyExpiryDate('2026-02-30', 3), RangeError)
  assert.throws(() => classifyExpiryDate('17.08.2026', 3), RangeError)
})

test('invalid expiring-days configuration falls back deterministically', () => {
  assert.equal(resolveExpiringDays(undefined), 3)
  assert.equal(resolveExpiringDays(''), 3)
  assert.equal(resolveExpiringDays('5'), 5)
  assert.equal(resolveExpiringDays('-1'), 3)
  assert.equal(resolveExpiringDays('3.5'), 3)
  assert.equal(resolveExpiringDays('not-a-number'), 3)
})

test('invalid thresholds are rejected by the domain classifier', () => {
  assert.throws(() => classifyExpiryDate('2026-08-17', -1), RangeError)
  assert.throws(() => classifyExpiryDate('2026-08-17', 1.5), RangeError)
})
