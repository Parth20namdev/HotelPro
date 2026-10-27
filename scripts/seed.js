const { randomUUID } = require('node:crypto')
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')
const { database, collection: c, indexes, ObjectId } = require('../server/db.cjs')
const D = require('../server/domain.cjs')

dotenv.config()

async function seed() {
  try {
    const { db } = await database()
    await indexes(db)

    // Clear existing collections
    await Promise.all([
      c(db, 'settings').deleteMany({}),
      c(db, 'users').deleteMany({}),
      c(db, 'rooms').deleteMany({}),
      c(db, 'bookings').deleteMany({}),
      c(db, 'guests').deleteMany({}),
      c(db, 'payments').deleteMany({}),
      c(db, 'attempts').deleteMany({}),
      c(db, 'services').deleteMany({}),
      c(db, 'activity').deleteMany({}),
    ])

    // 1. Hotel Property Settings
    const hotelSettings = {
      _id: 'hotel',
      name: 'HotelPro Grand Resort & Residences',
      email: 'concierge@hotelpro.com',
      phone: '+1 800 555 4683',
      address: '700 Ocean Drive, Coastal Vista, CA 90291',
      timezone: 'America/Los_Angeles',
      currency: 'INR',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxBasisPoints: 1200, // 12%
      createdAt: new Date(),
    }
    await c(db, 'settings').insertOne(hotelSettings)

    // 2. Users (Admin, Staff, Guests)
    const passwordHashAdmin = await bcrypt.hash('Admin@HotelPro2026!', 12)
    const passwordHashStaff = await bcrypt.hash('Staff@HotelPro2026!', 12)
    const passwordHashGuest = await bcrypt.hash('Guest@HotelPro2026!', 12)

    const adminUser = {
      _id: new ObjectId(),
      name: 'Marcus Vance',
      email: 'admin@hotelpro.com',
      phone: '+1 555 234 5678',
      passwordHash: passwordHashAdmin,
      role: 'admin',
      active: true,
      createdAt: new Date(),
    }

    const staffUser = {
      _id: new ObjectId(),
      name: 'Elena Rostova',
      email: 'frontdesk@hotelpro.com',
      phone: '+1 555 345 6789',
      passwordHash: passwordHashStaff,
      role: 'staff',
      active: true,
      createdAt: new Date(),
    }

    const guestSophia = {
      _id: new ObjectId(),
      name: 'Sophia Martinez',
      email: 'sophia.martinez@outlook.com',
      phone: '+1 555 678 9012',
      passwordHash: passwordHashGuest,
      role: 'guest',
      active: true,
      createdAt: new Date(),
    }

    const guestDavid = {
      _id: new ObjectId(),
      name: 'David Chen',
      email: 'david.chen@gmail.com',
      phone: '+1 555 789 0123',
      passwordHash: passwordHashGuest,
      role: 'guest',
      active: true,
      createdAt: new Date(),
    }

    const guestOlivia = {
      _id: new ObjectId(),
      name: 'Olivia Williams',
      email: 'olivia.williams@yahoo.com',
      phone: '+1 555 890 1234',
      passwordHash: passwordHashGuest,
      role: 'guest',
      active: true,
      createdAt: new Date(),
    }

    await c(db, 'users').insertMany([
      adminUser,
      staffUser,
      guestSophia,
      guestDavid,
      guestOlivia,
    ])

    // 3. Guest Profiles Directory
    const profileSophia = {
      _id: new ObjectId(),
      name: guestSophia.name,
      email: guestSophia.email,
      phone: guestSophia.phone,
      notes: 'VIP Preferred Guest. High floor requested.',
      createdAt: new Date(),
    }

    const profileDavid = {
      _id: new ObjectId(),
      name: guestDavid.name,
      email: guestDavid.email,
      phone: guestDavid.phone,
      notes: 'Celebrates anniversary during stay. Airport transfer requested.',
      createdAt: new Date(),
    }

    const profileOlivia = {
      _id: new ObjectId(),
      name: guestOlivia.name,
      email: guestOlivia.email,
      phone: guestOlivia.phone,
      notes: 'Allergic to feather pillows. Synthetic bedding assigned.',
      createdAt: new Date(),
    }

    await c(db, 'guests').insertMany([profileSophia, profileDavid, profileOlivia])

    // 4. Room Inventory
    const room101 = {
      _id: new ObjectId(),
      number: '101',
      title: 'Executive King Harbor Suite',
      type: 'Standard King',
      description: 'Refined standard king featuring custom walnut furnishings, floor-to-ceiling city views, a dedicated ergonomic workstation, and an Italian marble bathroom with rainfall shower.',
      priceMinor: 24000,
      floor: 1,
      capacity: { adults: 2, children: 1 },
      amenities: [
        'High-speed Wi-Fi 6',
        'Nespresso Coffee Machine',
        'Marble Rainfall Shower',
        '4K Ultra HD Smart TV',
        'Ergonomic Workstation',
        'In-room Safe',
        'Plush Bathrobes & Slippers',
      ],
      images: [
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'available',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    const room201 = {
      _id: new ObjectId(),
      number: '201',
      title: 'Pacific Azure Deluxe Suite',
      type: 'Deluxe Ocean View',
      description: 'Panoramic coastal sanctuary boasting a private furnished balcony overlooking the harbor, designer lounge area, premium soundbar system, and a deep soaking bathtub.',
      priceMinor: 38000,
      floor: 2,
      capacity: { adults: 2, children: 2 },
      amenities: [
        'Oceanfront Private Balcony',
        'Deep Soaking Freestanding Tub',
        'Sonos Premium Sound System',
        'Curated Mini-Bar & Wine Cooler',
        'Molton Brown Bath Amenities',
        'High-speed Wi-Fi 6',
      ],
      images: [
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'available',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    const room301 = {
      _id: new ObjectId(),
      number: '301',
      title: 'The Sovereign Executive Suite',
      type: 'Executive Suite',
      description: 'Expansive corner suite featuring a separate executive parlor, dining table for four, walk-in dressing room, and automated blackout drapery with touch bedside controls.',
      priceMinor: 55000,
      floor: 3,
      capacity: { adults: 3, children: 2 },
      amenities: [
        'Separate Living & Dining Salon',
        'Touchpad Smart Room Automation',
        'Walk-in Wardrobe',
        'Executive Lounge Access',
        'Wine Chiller with Sommelier Selection',
        'Bose Surround Audio',
      ],
      images: [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'available',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    const room401 = {
      _id: new ObjectId(),
      number: '401',
      title: 'Grand Horizon Family Suite',
      type: 'Family Luxury Suite',
      description: 'Designed for family comfort and privacy, offering two interconnected bedrooms, two full en-suite bathrooms, and a dedicated entertainment center.',
      priceMinor: 49000,
      floor: 4,
      capacity: { adults: 4, children: 2 },
      amenities: [
        'Two En-suite Bathrooms',
        'Smart Entertainment Hub & Board Games',
        'Kitchenette with Refrigerator',
        'Children Bathrobes & Amenities',
        'High-speed Wi-Fi 6',
      ],
      images: [
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'cleaning',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    const room501 = {
      _id: new ObjectId(),
      number: '501',
      title: 'Imperial Terrace Presidential Suite',
      type: 'Presidential Suite',
      description: 'The pinnacle of luxury hospitality. Encompassing the entire western wing, this penthouse features an outdoor heated jacuzzi on a 400-sq-ft private terrace, grand piano, and dedicated butler team.',
      priceMinor: 125000,
      floor: 5,
      capacity: { adults: 4, children: 2 },
      amenities: [
        'Private Heated Terrace Jacuzzi',
        '24/7 Dedicated Butler Service',
        'Private Cocktail Bar & Pantry',
        'Bespoke King Bedding by Frette',
        'Bang & Olufsen Sound System',
        'Private Elevator Keycard Access',
      ],
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'available',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    const room102 = {
      _id: new ObjectId(),
      number: '102',
      title: 'Classic Courtyard King',
      type: 'Standard King',
      description: 'Tranquil garden-facing retreat with soundproof acoustic glazing, artisanal wood detailing, crisp high-thread-count Egyptian cotton linens, and a walk-in shower.',
      priceMinor: 21000,
      floor: 1,
      capacity: { adults: 2, children: 1 },
      amenities: [
        'Courtyard Garden View',
        'Soundproof Double Glazing',
        'Egyptian Cotton Linens',
        'Rainfall Walk-in Shower',
        'High-speed Wi-Fi 6',
      ],
      images: [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      ],
      state: 'available',
      archived: false,
      version: 0,
      createdAt: new Date(),
    }

    await c(db, 'rooms').insertMany([room101, room201, room301, room401, room501, room102])

    // Calculate dynamic dates relative to current date in hotel timezone
    const todayStr = D.today(hotelSettings.timezone)
    const dateOffset = (days) => {
      const d = new Date(`${todayStr}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + days)
      return d.toISOString().slice(0, 10)
    }

    const twoDaysAgo = dateOffset(-2)
    const twoDaysAhead = dateOffset(2)
    const threeDaysAhead = dateOffset(3)
    const sevenDaysAhead = dateOffset(7)
    const tenDaysAgo = dateOffset(-10)
    const fiveDaysAgo = dateOffset(-5)

    // 5. Bookings
    // 5a. Current In-House Active Stay (Room 201, Sophia Martinez)
    const nightsActive = D.nights(twoDaysAgo, twoDaysAhead)
    const subtotalActive = room201.priceMinor * nightsActive
    const taxActive = Math.round(subtotalActive * hotelSettings.taxBasisPoints / 10000)
    const totalActive = subtotalActive + taxActive

    const bookingActive = {
      _id: new ObjectId(),
      requestId: randomUUID(),
      reference: 'HP-8842',
      createdById: guestSophia._id,
      userId: guestSophia._id,
      guestId: profileSophia._id,
      roomId: room201._id,
      roomNumber: room201.number,
      roomTitle: room201.title,
      roomType: room201.type,
      image: room201.images[0],
      guest: {
        name: guestSophia.name,
        email: guestSophia.email,
        phone: guestSophia.phone,
      },
      checkIn: twoDaysAgo,
      checkOut: twoDaysAhead,
      adults: 2,
      children: 0,
      nights: nightsActive,
      rateMinor: room201.priceMinor,
      subtotalMinor: subtotalActive,
      taxMinor: taxActive,
      totalMinor: totalActive,
      paidMinor: totalActive, // Settled
      currency: hotelSettings.currency,
      status: 'checked_in',
      notes: 'High floor preferred, quiet room away from elevator.',
      createdAt: new Date(Date.now() - 3 * 86400000),
      checkedInAt: new Date(Date.now() - 2 * 86400000),
    }

    // 5b. Upcoming Confirmed Stay (Room 501, David Chen)
    const nightsUpcoming = D.nights(threeDaysAhead, sevenDaysAhead)
    const subtotalUpcoming = room501.priceMinor * nightsUpcoming
    const taxUpcoming = Math.round(subtotalUpcoming * hotelSettings.taxBasisPoints / 10000)
    const totalUpcoming = subtotalUpcoming + taxUpcoming

    const bookingUpcoming = {
      _id: new ObjectId(),
      requestId: randomUUID(),
      reference: 'HP-9124',
      createdById: guestDavid._id,
      userId: guestDavid._id,
      guestId: profileDavid._id,
      roomId: room501._id,
      roomNumber: room501.number,
      roomTitle: room501.title,
      roomType: room501.type,
      image: room501.images[0],
      guest: {
        name: guestDavid.name,
        email: guestDavid.email,
        phone: guestDavid.phone,
      },
      checkIn: threeDaysAhead,
      checkOut: sevenDaysAhead,
      adults: 2,
      children: 1,
      nights: nightsUpcoming,
      rateMinor: room501.priceMinor,
      subtotalMinor: subtotalUpcoming,
      taxMinor: taxUpcoming,
      totalMinor: totalUpcoming,
      paidMinor: 0, // Due at hotel
      currency: hotelSettings.currency,
      status: 'confirmed',
      notes: 'Chauffeured pickup requested from terminal 2.',
      createdAt: new Date(Date.now() - 1 * 86400000),
    }

    // 5c. Past Completed Stay (Room 101, Olivia Williams)
    const nightsPast = D.nights(tenDaysAgo, fiveDaysAgo)
    const subtotalPast = room101.priceMinor * nightsPast
    const taxPast = Math.round(subtotalPast * hotelSettings.taxBasisPoints / 10000)
    const totalPast = subtotalPast + taxPast

    const bookingPast = {
      _id: new ObjectId(),
      requestId: randomUUID(),
      reference: 'HP-7491',
      createdById: guestOlivia._id,
      userId: guestOlivia._id,
      guestId: profileOlivia._id,
      roomId: room101._id,
      roomNumber: room101.number,
      roomTitle: room101.title,
      roomType: room101.type,
      image: room101.images[0],
      guest: {
        name: guestOlivia.name,
        email: guestOlivia.email,
        phone: guestOlivia.phone,
      },
      checkIn: tenDaysAgo,
      checkOut: fiveDaysAgo,
      adults: 2,
      children: 0,
      nights: nightsPast,
      rateMinor: room101.priceMinor,
      subtotalMinor: subtotalPast,
      taxMinor: taxPast,
      totalMinor: totalPast,
      paidMinor: totalPast,
      currency: hotelSettings.currency,
      status: 'checked_out',
      notes: 'Extra hypoallergenic pillows.',
      createdAt: new Date(Date.now() - 12 * 86400000),
      checkedInAt: new Date(Date.now() - 10 * 86400000),
      checkedOutAt: new Date(Date.now() - 5 * 86400000),
    }

    await c(db, 'bookings').insertMany([bookingActive, bookingUpcoming, bookingPast])

    // 6. Payments
    await c(db, 'payments').insertMany([
      {
        _id: new ObjectId(),
        bookingId: bookingActive._id,
        bookingReference: bookingActive.reference,
        guestName: bookingActive.guest.name,
        amountMinor: bookingActive.totalMinor,
        currency: hotelSettings.currency,
        method: 'external-card',
        reference: 'TXN-90238472',
        requestId: randomUUID(),
        recordedBy: staffUser.name,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        _id: new ObjectId(),
        bookingId: bookingPast._id,
        bookingReference: bookingPast.reference,
        guestName: bookingPast.guest.name,
        amountMinor: bookingPast.totalMinor,
        currency: hotelSettings.currency,
        method: 'external-card',
        reference: 'TXN-90237190',
        requestId: randomUUID(),
        recordedBy: staffUser.name,
        createdAt: new Date(Date.now() - 10 * 86400000),
      },
    ])

    // 7. Services & Housekeeping Tickets
    await c(db, 'services').insertMany([
      {
        _id: new ObjectId(),
        roomId: room201._id,
        roomNumber: room201.number,
        bookingId: bookingActive._id,
        userId: guestSophia._id,
        guestName: guestSophia.name,
        type: 'Fresh Linen',
        notes: 'Requesting extra plush bath sheets and chamomile tea replenishment.',
        priority: 'normal',
        status: 'in_progress',
        assignedTo: staffUser.name,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        _id: new ObjectId(),
        roomId: room401._id,
        roomNumber: room401.number,
        bookingId: null,
        userId: staffUser._id,
        guestName: staffUser.name,
        type: 'Housekeeping',
        notes: 'Turnover cleaning following checkout. Sanitize balcony and restock bar.',
        priority: 'urgent',
        status: 'pending',
        assignedTo: '',
        createdAt: new Date(Date.now() - 7200000),
      },
    ])

    // 8. Audit Trail / Activity
    await c(db, 'activity').insertMany([
      {
        _id: new ObjectId(),
        actor: adminUser.name,
        description: 'Initialized HotelPro Grand Resort configuration and room inventory.',
        createdAt: new Date(Date.now() - 14 * 86400000),
      },
      {
        _id: new ObjectId(),
        actor: staffUser.name,
        description: `Checked in guest ${guestSophia.name} to Room 201 (Ref: ${bookingActive.reference}).`,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        _id: new ObjectId(),
        actor: staffUser.name,
        description: `Recorded payment of ₹${(bookingActive.totalMinor / 100).toFixed(2)} for ${bookingActive.reference}.`,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    ])

    process.exit(0)
  } catch (error) {
    process.stderr.write(`Seeding failed: ${error.message}\n`)
    process.exit(1)
  }
}

seed()
