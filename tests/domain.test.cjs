const test = require('node:test')
const assert = require('node:assert/strict')
const D = require('../server/domain.cjs')

test('Domain Validation: nights calculation', () => {
  assert.equal(D.nights('2026-11-01', '2026-11-04'), 3)
  assert.equal(D.nights('2026-11-01', '2026-11-02'), 1)
  assert.throws(() => D.nights('2026-11-04', '2026-11-01'), /1 and 365 nights/)
  assert.throws(() => D.nights('invalid-date', '2026-11-01'), /valid calendar date/)
})

test('Domain Validation: email validation', () => {
  assert.equal(D.email('Guest@Domain.COM'), 'guest@domain.com')
  assert.throws(() => D.email('invalid-email'), /valid email address/)
  assert.throws(() => D.email(''), /must contain/)
})

test('Domain Validation: password requirements', () => {
  assert.equal(D.password('StrongPassword2026!'), 'StrongPassword2026!')
  assert.throws(() => D.password('short'), /at least 12 characters/)
})

test('Domain Validation: minor currency calculation', () => {
  assert.equal(D.minor('100'), 10000)
  assert.equal(D.minor('100.50'), 10050)
  assert.equal(D.minor('0.99'), 99)
  assert.throws(() => D.minor('-50'), /positive amount/)
  assert.throws(() => D.minor('abc'), /positive amount/)
})

test('Domain Validation: booking state machine transitions', () => {
  const confirmedStay = { status: 'confirmed', paidMinor: 0, checkIn: '2026-11-01', checkOut: '2026-11-04' }
  // Valid cancellation
  assert.doesNotThrow(() => D.transition(confirmedStay, 'cancelled', '2026-10-25'))

  // Check-in during stay dates
  assert.doesNotThrow(() => D.transition(confirmedStay, 'checked_in', '2026-11-01'))

  // Check-in outside stay dates throws
  assert.throws(() => D.transition(confirmedStay, 'checked_in', '2026-10-25'), /Check-in is allowed only/)

  // Check-out requires checked-in status and paid balance
  const checkedInUnpaid = { status: 'checked_in', paidMinor: 5000, totalMinor: 10000 }
  assert.throws(() => D.transition(checkedInUnpaid, 'checked_out', '2026-11-04'), /balance settled/)

  const checkedInPaid = { status: 'checked_in', paidMinor: 10000, totalMinor: 10000 }
  assert.doesNotThrow(() => D.transition(checkedInPaid, 'checked_out', '2026-11-04'))
})
