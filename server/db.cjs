const { MongoClient, ObjectId } = require('mongoose').mongo
const { HttpError } = require('./domain.cjs')
const cache = globalThis.__hotelpro2 ||= { promise: null, indexes: null }
const collection = (db, name) => db.collection(`hp2_${name}`)
async function indexes(db) {
  await Promise.all([
    collection(db, 'users').createIndex({ email: 1 }, { unique: true }),
    collection(db, 'rooms').createIndex({ number: 1 }, { unique: true }),
    collection(db, 'bookings').createIndex({ roomId: 1, status: 1, checkIn: 1, checkOut: 1 }),
    collection(db, 'bookings').createIndex({ createdById: 1, requestId: 1 }, { unique: true }),
    collection(db, 'guests').createIndex({ email: 1 }, { unique: true }),
    collection(db, 'payments').createIndex({ requestId: 1 }, { unique: true }),
    collection(db, 'attempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collection(db, 'services').createIndex({ userId: 1, createdAt: -1 }),
  ])
}
async function database() {
  if (!process.env.MONGODB_URI) throw new HttpError(503, 'MongoDB Atlas is not configured. Complete the server setup to continue.')
  if (!cache.promise) cache.promise = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 3500 }).connect().catch((error) => { cache.promise = null; throw error })
  const client = await cache.promise
  const db = client.db(process.env.MONGODB_DB || 'hotelpro')
  if (!cache.indexes) cache.indexes = indexes(db).catch((error) => { cache.indexes = null; throw error })
  await cache.indexes
  return { client, db }
}
async function transaction(work) { const { db, client } = await database(); const session = client.startSession(); try { return await session.withTransaction(() => work(db, session)) } finally { await session.endSession() } }
module.exports = { database, transaction, collection, indexes, ObjectId }
