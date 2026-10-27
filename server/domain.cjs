class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }
const fail = (message, status = 400) => { throw new HttpError(status, message) }
function text(value, name, min = 1, max = 200) { if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`${name} must contain ${min}–${max} characters.`); return value.trim() }
function email(value) { const result = text(value, 'Email', 3, 160).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Enter a valid email address.'); return result }
function password(value) { if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value) > 72) fail('Use a password with at least 12 characters and at most 72 UTF-8 bytes.'); return value }
function integer(value, name, min, max) { const result = Number(value); if (!Number.isSafeInteger(result) || result < min || result > max) fail(`${name} must be between ${min} and ${max}.`); return result }
function minor(value) { if (!/^\d+(\.\d{1,2})?$/.test(String(value))) fail('Enter a positive amount with at most two decimal places.'); const [whole, fraction = ''] = String(value).split('.'); const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0')); if (!Number.isSafeInteger(result) || result <= 0 || result > 1000000000) fail('Amount is outside the supported range.'); return result }
function date(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Enter a valid calendar date.'); return value }
function nights(start, end) { date(start); date(end); const result = (Date.parse(end) - Date.parse(start)) / 86400000; if (!Number.isInteger(result) || result < 1 || result > 365) fail('A stay must be between 1 and 365 nights.'); return result }
function today(timezone) { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function timezone(value) { try { new Intl.DateTimeFormat('en', { timeZone: value }); return value } catch { fail('Choose a valid hotel time zone.') } }
function transition(booking, status, currentDate) {
  if (status === 'cancelled') { if (booking.status !== 'confirmed' || booking.paidMinor) fail('Only an unpaid, confirmed reservation can be cancelled.', 409); return }
  if (status === 'checked_in') { if (booking.status !== 'confirmed' || currentDate < booking.checkIn || currentDate >= booking.checkOut) fail('Check-in is allowed only during the dates of a confirmed stay.', 409); return }
  if (status === 'checked_out') { if (booking.status !== 'checked_in' || booking.paidMinor !== booking.totalMinor) fail('Check-out requires a checked-in stay with its balance settled.', 409); return }
  fail('Invalid reservation action.')
}
function paymentAmount(booking, amount) { if (!['confirmed', 'checked_in'].includes(booking.status) || amount > booking.totalMinor - booking.paidMinor) fail('This payment exceeds the outstanding balance or the stay is closed.', 409) }
module.exports = { HttpError, fail, text, email, password, integer, minor, date, nights, today, timezone, transition, paymentAmount }
