const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { createHash, randomUUID } = require('node:crypto')
const { database, transaction, collection: c, ObjectId } = require('./db.cjs')
const D = require('./domain.cjs')
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)
const id = (value) => { if (!ObjectId.isValid(value)) D.fail('Invalid record identifier.'); return new ObjectId(value) }
const publicUser = ({ _id, name, email, phone, role, active }) => ({ id: String(_id), name, email, phone, role, active })
const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }
function signingKey() { if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) D.fail('Authentication setup is incomplete. Configure a strong JWT_SECRET.', 503); return process.env.JWT_SECRET }
function token(user) { return jwt.sign({ sub: String(user._id) }, signingKey(), { expiresIn: '8h', algorithm: 'HS256', issuer: 'hotelpro2', audience: 'hotelpro-web' }) }
function sessionCookie(res, user) { res.cookie('hotelpro_session', token(user), { ...cookie, maxAge: 28800000 }) }
async function hotel(db, session) { const row = await c(db, 'settings').findOne({ _id: 'hotel' }, { session }); if (!row) D.fail('The hotel is not set up yet. Run the documented seed command.', 503); return row }
async function audit(db, user, description, session) { await c(db, 'activity').insertOne({ actor: user.name, description, createdAt: new Date() }, { session }) }
async function roomLock(db, _id, session) { const room = await c(db, 'rooms').findOneAndUpdate({ _id, archived: false }, { $inc: { version: 1 } }, { session, returnDocument: 'after' }); if (!room) D.fail('Room not found.', 404); return room }
function requestId(value) { if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value)) D.fail('A valid request identifier is required.'); return value }
async function throttle(req, category, identifier = '') {
  const { db } = await database()
  const bucket = Math.floor(Date.now() / 900000)
  // Vercel supplies x-real-ip; the local development server uses the socket address.
  const clientIp = process.env.VERCEL ? req.get('x-real-ip') || req.ip : req.ip
  const key = createHash('sha256').update(`${category}:${clientIp}:${identifier}:${bucket}`).digest('hex')
  const row = await c(db, 'attempts').findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * 900000) } }, { upsert: true, returnDocument: 'after' })
  if (row.count > (category === 'register' ? 5 : 12)) D.fail('Too many attempts. Please try again in 15 minutes.', 429)
}
app.use('/api', (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' })
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!req.is('application/json')) return next(new D.HttpError(415, 'A JSON request body is required.'))
    try { const host = req.get('x-forwarded-host') || req.get('host'); if (req.get('sec-fetch-site') === 'cross-site' || (req.get('origin') && new URL(req.get('origin')).host !== host)) throw Error() }
    catch { return next(new D.HttpError(403, 'Open HotelPro to make this change.')) }
  }
  next()
})
app.get('/api/health', wrap(async (_req, res) => { const { db } = await database(); await db.command({ ping: 1 }); res.json({ status: 'ok', database: 'connected' }) }))
app.get('/api/hotel', wrap(async (_req, res) => { const { db } = await database(); res.json({ hotel: await hotel(db) }) }))
app.post('/api/auth/register', wrap(async (req, res) => {
  const name = D.text(req.body.name, 'Name', 2, 100), email = D.email(req.body.email), password = D.password(req.body.password), phone = D.text(req.body.phone || '', 'Phone', 0, 30)
  if (req.body.role && req.body.role !== 'guest') D.fail('Staff accounts must be created by a hotel administrator.', 403)
  signingKey(); await throttle(req, 'register')
  const { db } = await database(); await hotel(db)
  const user = { _id: new ObjectId(), name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: 'guest', active: true, createdAt: new Date() }
  await c(db, 'users').insertOne(user)
  sessionCookie(res, user); res.status(201).json({ user: publicUser(user) })
}))
app.post('/api/auth/login', wrap(async (req, res) => {
  const email = D.email(req.body.email), password = D.text(req.body.password, 'Password', 1, 128)
  signingKey(); await throttle(req, 'login', email)
  const { db } = await database(); const user = await c(db, 'users').findOne({ email, active: true })
  if (!user || !await bcrypt.compare(password, user.passwordHash)) D.fail('Email or password is incorrect.', 401)
  sessionCookie(res, user); res.json({ user: publicUser(user) })
}))
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('hotelpro_session', cookie); res.json({ ok: true }) })
async function publicRooms(req) {
  const { db } = await database(); let query = { archived: false }
  if (req.query.type) query.type = String(req.query.type)
  if (req.query.adults) query['capacity.adults'] = { $gte: D.integer(req.query.adults, 'Adults', 1, 12) }
  if (req.query.children) query['capacity.children'] = { $gte: D.integer(req.query.children, 'Children', 0, 12) }
  if (req.query.checkIn || req.query.checkOut) {
    D.nights(req.query.checkIn, req.query.checkOut)
    query.state = { $ne: 'maintenance' }
    const booked = await c(db, 'bookings').find({ status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lt: req.query.checkOut }, checkOut: { $gt: req.query.checkIn } }, { projection: { roomId: 1 } }).toArray()
    query._id = { $nin: booked.map((b) => b.roomId) }
  }
  return c(db, 'rooms').find(query, { projection: { version: 0 } }).sort({ priceMinor: 1, number: 1 }).toArray()
}
app.get('/api/rooms', wrap(async (req, res) => res.json({ rooms: await publicRooms(req) })))
app.get('/api/rooms/:id', wrap(async (req, res) => { const { db } = await database(); const room = await c(db, 'rooms').findOne({ _id: id(req.params.id), archived: false }, { projection: { version: 0 } }); if (!room) D.fail('Room not found.', 404); res.json({ room }) }))
app.use('/api', wrap(async (req, _res, next) => {
  const match = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith('hotelpro_session='))
  if (!match) D.fail('Please sign in to continue.', 401)
  let claims; const secret = signingKey()
  try { claims = jwt.verify(decodeURIComponent(match.slice(17)), secret, { algorithms: ['HS256'], issuer: 'hotelpro2', audience: 'hotelpro-web' }) } catch { D.fail('Your session has expired. Sign in again.', 401) }
  const { db } = await database(); const user = await c(db, 'users').findOne({ _id: id(claims.sub), active: true })
  if (!user) D.fail('Your account is inactive. Contact the hotel.', 401)
  req.user = user; next()
}))
const roles = (...allowed) => (req, _res, next) => allowed.includes(req.user.role) ? next() : next(new D.HttpError(403, 'You do not have access to this action.'))
app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }))
app.put('/api/auth/profile', wrap(async (req, res) => {
  const changes = { name: D.text(req.body.name, 'Name', 2, 100), phone: D.text(req.body.phone || '', 'Phone', 0, 30) }
  if (req.body.password) { D.password(req.body.password); if (!await bcrypt.compare(String(req.body.currentPassword || ''), req.user.passwordHash)) D.fail('Current password is incorrect.', 403); changes.passwordHash = await bcrypt.hash(req.body.password, 12) }
  const { db } = await database(); await c(db, 'users').updateOne({ _id: req.user._id }, { $set: changes }); res.json({ user: publicUser({ ...req.user, ...changes }) })
}))
app.post('/api/bookings', wrap(async (req, res) => {
  const input = req.body, roomId = id(input.roomId), totalNights = D.nights(input.checkIn, input.checkOut), key = requestId(input.requestId)
  const adults = D.integer(input.adults, 'Adults', 1, 12), children = D.integer(input.children || 0, 'Children', 0, 12)
  const guest = { name: D.text(input.guest?.name || req.user.name, 'Guest name', 2, 100), email: D.email(input.guest?.email || req.user.email), phone: D.text(input.guest?.phone || req.user.phone || '', 'Guest phone', 0, 30) }
  const notes = D.text(input.notes || '', 'Special requests', 0, 1000)
  const booking = await transaction(async (db, session) => {
    const prior = await c(db, 'bookings').findOne({ createdById: req.user._id, requestId: key }, { session })
    if (prior) { if (String(prior.roomId) !== String(roomId) || prior.checkIn !== input.checkIn || prior.checkOut !== input.checkOut || prior.adults !== adults || prior.children !== children) D.fail('This request was already saved with different details.', 409); return prior }
    const room = await roomLock(db, roomId, session), settings = await hotel(db, session)
    if (input.checkIn < D.today(settings.timezone)) D.fail('Check-in cannot be in the past.')
    if (room.state === 'maintenance' || room.capacity.adults < adults || room.capacity.children < children) D.fail('This room cannot accommodate the selected stay.', 409)
    const clash = await c(db, 'bookings').findOne({ roomId, status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } }, { session })
    if (clash) D.fail('This room was just reserved for those dates. Please choose another.', 409)
    const subtotalMinor = room.priceMinor * totalNights, taxMinor = Math.round(subtotalMinor * settings.taxBasisPoints / 10000)
    let profile = await c(db, 'guests').findOne({ email: guest.email }, { session })
    if (!profile) { profile = { _id: new ObjectId(), ...guest, notes: '', createdAt: new Date() }; await c(db, 'guests').insertOne(profile, { session }) }
    const account = req.user.role !== 'guest' ? await c(db, 'users').findOne({ email: guest.email, role: 'guest' }, { session }) : req.user
    const row = { _id: new ObjectId(), requestId: key, reference: `HP-${randomUUID().slice(0, 8).toUpperCase()}`, createdById: req.user._id, userId: account?._id || req.user._id, guestId: profile._id, roomId, roomNumber: room.number, roomTitle: room.title, roomType: room.type, image: room.images[0] || '', guest, checkIn: input.checkIn, checkOut: input.checkOut, adults, children, nights: totalNights, rateMinor: room.priceMinor, subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor, paidMinor: 0, currency: settings.currency, status: 'confirmed', notes, createdAt: new Date() }
    await c(db, 'bookings').insertOne(row, { session }); await audit(db, req.user, `Created ${row.reference}, room ${room.number}.`, session); return row
  })
  res.status(201).json({ booking })
}))
app.get('/api/bookings/my', wrap(async (req, res) => { const { db } = await database(); res.json({ bookings: await c(db, 'bookings').find({ userId: req.user._id }).sort({ createdAt: -1 }).toArray() }) }))
app.get('/api/bookings/:id', wrap(async (req, res) => { const { db } = await database(); const query = { _id: id(req.params.id), ...(req.user.role === 'guest' ? { userId: req.user._id } : {}) }; const booking = await c(db, 'bookings').findOne(query); if (!booking) D.fail('Reservation not found.', 404); res.json({ booking, payments: await c(db, 'payments').find({ bookingId: booking._id }).toArray() }) }))
app.patch('/api/bookings/:id/status', wrap(async (req, res) => {
  const status = req.body.status
  if (req.user.role === 'guest' && status !== 'cancelled') D.fail('Only hotel staff can check guests in or out.', 403)
  const booking = await transaction(async (db, session) => {
    const row = await c(db, 'bookings').findOne({ _id: id(req.params.id), ...(req.user.role === 'guest' ? { userId: req.user._id } : {}) }, { session })
    if (!row) D.fail('Reservation not found.', 404)
    const room = await roomLock(db, row.roomId, session), settings = await hotel(db, session)
    D.transition(row, status, D.today(settings.timezone))
    if (status === 'checked_in' && (room.state !== 'available' || await c(db, 'bookings').findOne({ roomId: row.roomId, status: 'checked_in' }, { session }))) D.fail('This room must be vacant and ready before check-in.', 409)
    const changes = { status, updatedAt: new Date(), ...(status === 'checked_in' ? { checkedInAt: new Date() } : status === 'checked_out' ? { checkedOutAt: new Date() } : {}) }
    await c(db, 'bookings').updateOne({ _id: row._id }, { $set: changes }, { session })
    if (status === 'checked_out') await c(db, 'rooms').updateOne({ _id: row.roomId }, { $set: { state: 'cleaning' } }, { session })
    await audit(db, req.user, `${row.reference}: ${status.replace('_', ' ')}.`, session); return { ...row, ...changes }
  }); res.json({ booking })
}))
app.post('/api/bookings/:id/payments', roles('admin', 'staff'), wrap(async (req, res) => {
  const bookingId = id(req.params.id), amountMinor = D.minor(req.body.amount), key = requestId(req.body.requestId)
  const method = D.text(req.body.method, 'Payment method', 1, 30); if (!['cash', 'bank-transfer', 'upi', 'external-card'].includes(method)) D.fail('Choose a supported payment method.')
  const reference = D.text(req.body.reference || '', 'Transaction reference', method === 'cash' ? 0 : 1, 120)
  const payment = await transaction(async (db, session) => {
    const prior = await c(db, 'payments').findOne({ requestId: key }, { session }); if (prior) { if (String(prior.bookingId) !== String(bookingId) || prior.amountMinor !== amountMinor || prior.method !== method || prior.reference !== reference) D.fail('This payment request was already saved with different details.', 409); return prior }
    const booking = await c(db, 'bookings').findOne({ _id: bookingId }, { session }); if (!booking) D.fail('Reservation not found.', 404); D.paymentAmount(booking, amountMinor)
    await c(db, 'bookings').updateOne({ _id: bookingId }, { $inc: { paidMinor: amountMinor } }, { session })
    const row = { _id: new ObjectId(), bookingId, bookingReference: booking.reference, guestName: booking.guest.name, amountMinor, currency: booking.currency, method, reference, requestId: key, recordedBy: req.user.name, createdAt: new Date() }
    await c(db, 'payments').insertOne(row, { session }); await audit(db, req.user, `Recorded received payment for ${booking.reference}.`, session); return row
  }); res.status(201).json({ payment })
}))
function roomInput(input) {
  const images = Array.isArray(input.images) ? input.images : []
  if (images.length > 8 || images.some((url) => { try { return new URL(url).protocol !== 'https:' } catch { return true } })) D.fail('Use up to eight HTTPS image URLs.')
  return { number: D.text(input.number, 'Room number', 1, 12), title: D.text(input.title, 'Room title', 2, 120), type: D.text(input.type, 'Room category', 2, 80), description: D.text(input.description || '', 'Description', 0, 3000), priceMinor: D.minor(input.price), floor: D.integer(input.floor || 0, 'Floor', 0, 100), capacity: { adults: D.integer(input.adults, 'Adult capacity', 1, 12), children: D.integer(input.children || 0, 'Child capacity', 0, 12) }, amenities: (Array.isArray(input.amenities) ? input.amenities : []).map((v) => D.text(v, 'Amenity', 1, 80)).slice(0, 30), images }
}
app.post('/api/rooms', roles('admin'), wrap(async (req, res) => { const input = roomInput(req.body); const room = { _id: new ObjectId(), ...input, state: 'available', archived: false, version: 0, createdAt: new Date() }; const { db } = await database(); await c(db, 'rooms').insertOne(room); await audit(db, req.user, `Added room ${room.number}.`); res.status(201).json({ room }) }))
app.put('/api/rooms/:id', roles('admin'), wrap(async (req, res) => { const input = roomInput(req.body); await transaction(async (db, session) => { const room = await roomLock(db, id(req.params.id), session); const active = await c(db, 'bookings').findOne({ roomId: room._id, status: { $in: ['confirmed', 'checked_in'] } }, { session }); if (active && (room.number !== input.number || room.type !== input.type || input.capacity.adults < room.capacity.adults || input.capacity.children < room.capacity.children)) D.fail('Resolve active stays before renumbering or reducing room capacity.', 409); await c(db, 'rooms').updateOne({ _id: room._id }, { $set: input }, { session }); await audit(db, req.user, `Updated room ${room.number}.`, session) }); res.json({ ok: true }) }))
app.patch('/api/rooms/:id/status', roles('admin', 'staff'), wrap(async (req, res) => {
  if (!['available', 'cleaning', 'maintenance'].includes(req.body.state)) D.fail('Choose a valid room readiness state.')
  await transaction(async (db, session) => { const room = await roomLock(db, id(req.params.id), session); const clash = await c(db, 'bookings').findOne({ roomId: room._id, status: req.body.state === 'maintenance' ? { $in: ['confirmed', 'checked_in'] } : 'checked_in' }, { session }); if (clash) D.fail('Resolve this room’s active stays before changing its readiness.', 409); await c(db, 'rooms').updateOne({ _id: room._id }, { $set: { state: req.body.state } }, { session }); await audit(db, req.user, `Room ${room.number}: ${req.body.state}.`, session) }); res.json({ ok: true })
}))
app.delete('/api/rooms/:id', roles('admin'), wrap(async (req, res) => { await transaction(async (db, session) => { const room = await roomLock(db, id(req.params.id), session); if (await c(db, 'bookings').findOne({ roomId: room._id, status: { $in: ['confirmed', 'checked_in'] } }, { session })) D.fail('Resolve active bookings before archiving this room.', 409); await c(db, 'rooms').updateOne({ _id: room._id }, { $set: { archived: true } }, { session }); await audit(db, req.user, `Archived room ${room.number}.`, session) }); res.json({ ok: true }) }))
const serviceTypes = ['Housekeeping', 'Fresh Linen', 'Maintenance', 'Room Dining', 'Luggage Assistance', 'Concierge']
app.post('/api/services', wrap(async (req, res) => {
  const type = req.body.type; if (!serviceTypes.includes(type)) D.fail('Select a service type.')
  const notes = D.text(req.body.notes, 'Request details', 3, 1000)
  const row = await transaction(async (db, session) => {
    let booking
    if (req.user.role === 'guest') { booking = await c(db, 'bookings').findOne({ _id: id(req.body.bookingId), userId: req.user._id, status: 'checked_in' }, { session }); if (!booking) D.fail('Services are available for your checked-in stays.', 403); await roomLock(db, booking.roomId, session); booking = await c(db, 'bookings').findOne({ _id: booking._id, status: 'checked_in' }, { session }); if (!booking) D.fail('This stay has ended.', 409) }
    const room = await c(db, 'rooms').findOne({ _id: booking ? booking.roomId : id(req.body.roomId), archived: false }, { session }); if (!room) D.fail('Room not found.', 404)
    const value = { _id: new ObjectId(), roomId: room._id, roomNumber: room.number, bookingId: booking?._id || null, userId: req.user._id, guestName: req.user.name, type, notes, priority: req.body.priority === 'urgent' ? 'urgent' : 'normal', status: 'pending', assignedTo: '', createdAt: new Date() }; await c(db, 'services').insertOne(value, { session }); return value
  }); res.status(201).json({ service: row })
}))
app.get('/api/services', wrap(async (req, res) => { const { db } = await database(); res.json({ services: await c(db, 'services').find(req.user.role === 'guest' ? { userId: req.user._id } : {}).sort({ createdAt: -1 }).toArray() }) }))
app.patch('/api/services/:id', roles('admin', 'staff'), wrap(async (req, res) => {
  const { status } = req.body; if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) D.fail('Invalid request status.')
  const { db } = await database(); const row = await c(db, 'services').findOne({ _id: id(req.params.id) }); if (!row) D.fail('Request not found.', 404)
  if (['completed', 'cancelled'].includes(row.status) && row.status !== status) D.fail('This request is closed.', 409)
  await c(db, 'services').updateOne({ _id: row._id, status: row.status }, { $set: { status, assignedTo: status === 'in_progress' ? req.user.name : row.assignedTo, updatedAt: new Date() } }); res.json({ ok: true })
}))
app.get('/api/state', roles('admin', 'staff'), wrap(async (req, res) => {
  const { db } = await database()
  const [settings, rooms, bookings, services, payments, activity, users, guests] = await Promise.all([hotel(db), c(db, 'rooms').find({ archived: false }).sort({ number: 1 }).toArray(), c(db, 'bookings').find().sort({ createdAt: -1 }).toArray(), c(db, 'services').find().sort({ createdAt: -1 }).toArray(), c(db, 'payments').find().sort({ createdAt: -1 }).toArray(), c(db, 'activity').find().sort({ createdAt: -1 }).limit(20).toArray(), c(db, 'users').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray(), c(db, 'guests').find().sort({ name: 1 }).toArray()])
  const occupied = bookings.filter((b) => b.status === 'checked_in').length
  res.json({ hotel: settings, rooms, bookings, services, payments, activity, guests, users: users.map(publicUser), today: D.today(settings.timezone), metrics: { occupied, occupancy: rooms.length ? Math.round(occupied * 100 / rooms.length) : 0, collectedMinor: payments.reduce((s, p) => s + p.amountMinor, 0), outstandingMinor: bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.totalMinor - b.paidMinor, 0) }, syncedAt: new Date().toISOString() })
}))
function guestInput(input) { return { name: D.text(input.name, 'Guest name', 2, 100), email: D.email(input.email), phone: D.text(input.phone || '', 'Phone', 0, 30), notes: D.text(input.notes || '', 'Guest notes', 0, 1000) } }
app.post('/api/guests', roles('admin', 'staff'), wrap(async (req, res) => { const guest = { _id: new ObjectId(), ...guestInput(req.body), createdAt: new Date() }; const { db } = await database(); await c(db, 'guests').insertOne(guest); res.status(201).json({ guest }) }))
app.put('/api/guests/:id', roles('admin', 'staff'), wrap(async (req, res) => { const { db } = await database(); const guest = await c(db, 'guests').findOneAndUpdate({ _id: id(req.params.id) }, { $set: guestInput(req.body) }, { returnDocument: 'after' }); if (!guest) D.fail('Guest not found.', 404); res.json({ guest }) }))
app.post('/api/staff', roles('admin'), wrap(async (req, res) => {
  const row = { _id: new ObjectId(), name: D.text(req.body.name, 'Name', 2, 100), email: D.email(req.body.email), phone: '', passwordHash: await bcrypt.hash(D.password(req.body.password), 12), role: 'staff', active: true, createdAt: new Date() }
  const { db } = await database(); await c(db, 'users').insertOne(row); await audit(db, req.user, `Created staff account for ${row.name}.`); res.status(201).json({ user: publicUser(row) })
}))
app.patch('/api/staff/:id', roles('admin'), wrap(async (req, res) => { if (typeof req.body.active !== 'boolean') D.fail('Choose an account state.'); const { db } = await database(); const member = await c(db, 'users').findOneAndUpdate({ _id: id(req.params.id), role: 'staff' }, { $set: { active: req.body.active } }, { returnDocument: 'after' }); if (!member) D.fail('Staff account not found.', 404); await audit(db, req.user, `${member.active ? 'Activated' : 'Deactivated'} ${member.name}.`); res.json({ user: publicUser(member) }) }))
app.put('/api/hotel', roles('admin'), wrap(async (req, res) => {
  const input = req.body, changes = { name: D.text(input.name, 'Hotel name', 2, 120), email: D.email(input.email), phone: D.text(input.phone || '', 'Phone', 0, 30), address: D.text(input.address || '', 'Address', 0, 300), timezone: D.timezone(input.timezone), taxBasisPoints: D.integer(input.taxBasisPoints, 'Tax basis points', 0, 10000) }
  for (const field of ['checkInTime', 'checkOutTime']) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[field])) D.fail('Enter valid check-in and check-out times.'); changes[field] = input[field] }
  const { db } = await database(); await c(db, 'settings').updateOne({ _id: 'hotel' }, { $set: changes }); await audit(db, req.user, 'Updated hotel settings.'); res.json({ hotel: await hotel(db) })
}))
app.use('/api', (_req, _res, next) => next(new D.HttpError(404, 'API endpoint not found.')))
app.use((error, _req, res, _next) => {
  if (error instanceof D.HttpError) return res.status(error.status).json({ message: error.message })
  if (error.code === 11000) return res.status(409).json({ message: 'An account, room, or request with these details already exists.' })
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request.' })
  console.error('HotelPro API:', error.name, error.code || '')
  res.status(503).json({ message: 'The database is unavailable. Please retry; your change has not been confirmed.' })
})
module.exports = app
