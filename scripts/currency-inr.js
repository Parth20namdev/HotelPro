const dotenv = require('dotenv')
const { database, transaction, collection: c } = require('../server/db.cjs')

dotenv.config({ quiet: true })

async function migrate() {
  const { db } = await database()
  const settings = await c(db, 'settings').findOne({ _id: 'hotel' })
  if (!settings) throw new Error('Hotel settings are missing. No currency changes were made.')
  if (!['USD', 'INR'].includes(settings.currency)) throw new Error(`Unsupported current currency: ${settings.currency}. No currency changes were made.`)

  const result = await transaction(async (txDb, session) => {
    const bookings = await c(txDb, 'bookings').updateMany({ currency: 'USD' }, { $set: { currency: 'INR' } }, { session })
    const payments = await c(txDb, 'payments').updateMany({ currency: 'USD' }, { $set: { currency: 'INR' } }, { session })
    const activity = await c(txDb, 'activity').find({ description: { $regex: '\\$' } }, { session }).toArray()
    for (const row of activity) {
      await c(txDb, 'activity').updateOne({ _id: row._id }, { $set: { description: row.description.replaceAll('$', '₹') } }, { session })
    }
    await c(txDb, 'settings').updateOne({ _id: 'hotel', currency: { $in: ['USD', 'INR'] } }, { $set: { currency: 'INR' } }, { session })
    return { bookings: bookings.modifiedCount, payments: payments.modifiedCount, activity: activity.length }
  })
  console.log(`Currency set to INR. Updated ${result.bookings} bookings, ${result.payments} payments, and ${result.activity} activity entries. Monetary amounts were kept unchanged.`)
}

migrate().then(() => process.exit(0)).catch((error) => {
  console.error(`Currency update failed: ${error.message}`)
  process.exit(1)
})
