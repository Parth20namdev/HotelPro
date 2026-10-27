import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { request } from '../services/api'
import { addDay, Alert, Empty, Field, Icon, money, RoomCard, RoomImage, today, useHotel, useLive } from './common'

export function SearchStay({ initial = {}, compact = false }) {
  const { hotel } = useHotel()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    checkIn: initial.checkIn || addDay(today(hotel?.timezone)),
    checkOut: initial.checkOut || addDay(today(hotel?.timezone), 3),
    adults: initial.adults || '2',
    children: initial.children || '0',
  })

  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <form
      className={`stay-search ${compact ? 'stay-search-compact' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/rooms?${new URLSearchParams(form)}`)
      }}
    >
      <Field label="CHECK-IN">
        <input
          aria-label="Check-in date"
          required
          type="date"
          min={today(hotel?.timezone)}
          value={form.checkIn}
          onChange={change('checkIn')}
        />
      </Field>

      <Field label="CHECK-OUT">
        <input
          aria-label="Check-out date"
          required
          type="date"
          min={addDay(form.checkIn || today())}
          value={form.checkOut}
          onChange={change('checkOut')}
        />
      </Field>

      <Field label="ADULTS">
        <select aria-label="Adults" value={form.adults} onChange={change('adults')}>
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <option key={v} value={v}>
              {v} adult{v > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="CHILDREN">
        <select aria-label="Children" value={form.children} onChange={change('children')}>
          {[0, 1, 2, 3, 4].map((v) => (
            <option key={v} value={v}>
              {v} children
            </option>
          ))}
        </select>
      </Field>

      <button type="submit" className="button button-primary search-submit">
        <Icon name="search" /> Find your stay
      </button>
    </form>
  )
}

export function Home() {
  const { hotel, error } = useHotel()
  const rooms = useLive('/rooms')

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow light">
            <span /> LUXURY RESIDENCES & SUITES
          </span>
          <h1>
            A little escape.<br />
            <em>A lasting feeling.</em>
          </h1>
          <p>
            Room to slow down. Space to feel at home.<br />
            Discover accommodations designed for comfort and modern hospitality.
          </p>
          <div className="hero-cta-group">
            <Link to="/rooms" className="hero-link">
              Explore our rooms <Icon name="arrow-up-right" />
            </Link>
          </div>
          <div className="hero-bottom">
            <span>
              <Icon name="geo-alt" /> {hotel?.name || 'HotelPro Grand Resort'}
            </span>
            <span>Thoughtful hospitality, from arrival to farewell.</span>
          </div>
        </div>
      </section>

      {/* Floating Search Bar */}
      <div className="search-wrap">
        <SearchStay />
      </div>

      {/* Room Showcase Section */}
      <section className="public-section">
        {error && <Alert>{error}</Alert>}
        {rooms.error && <Alert>{rooms.error}</Alert>}

        <div className="section-heading">
          <div>
            <span className="eyebrow">THE ROOM COLLECTION</span>
            <h2>
              Stay somewhere <em>special.</em>
            </h2>
            <p>Discover your space. Choose your dates. We’ll take care of the welcome.</p>
          </div>
          <Link className="button" to="/rooms">
            View all rooms <Icon name="arrow-up-right" />
          </Link>
        </div>

        {rooms.loading ? (
          <div className="skeleton-grid">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : rooms.data?.rooms?.length ? (
          <div className="room-grid">
            {rooms.data.rooms.slice(0, 3).map((r) => (
              <RoomCard key={r._id} room={r} currency={hotel?.currency} />
            ))}
          </div>
        ) : (
          <Empty
            title="Our collection is being prepared"
            action={
              <Link to="/rooms" className="button button-primary">
                Explore Rooms Catalog
              </Link>
            }
          >
            Suites will appear here as soon as inventory is populated. Connect MongoDB Atlas and run the seed command to load verified luxury rooms.
          </Empty>
        )}
      </section>

      {/* The HotelPro Standard Feature Strip */}
      <section className="experience-strip">
        <div className="experience-inner">
          <div className="experience-heading">
            <span className="eyebrow">THE HOTELPRO STANDARD</span>
            <h2>
              Good stays begin<br />
              with the little things.
            </h2>
            <p>Designed with care for seamless travel and genuine relaxation.</p>
          </div>

          <div className="experience-grid">
            <div className="experience-card">
              <div className="experience-icon-wrap">
                <Icon name="calendar2-check" />
              </div>
              <h3>A clear plan</h3>
              <p>Check live room availability for your dates and see the verified price before you reserve.</p>
            </div>

            <div className="experience-card">
              <div className="experience-icon-wrap">
                <Icon name="person-heart" />
              </div>
              <h3>Your stay, in one place</h3>
              <p>View reservations, print itemized tax statements, and keep all stay details at hand.</p>
            </div>

            <div className="experience-card">
              <div className="experience-icon-wrap">
                <Icon name="chat-square-heart" />
              </div>
              <h3>A little extra care</h3>
              <p>Request fresh linen, housekeeping, or luggage assistance directly from your guest portal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Call to Action */}
      <section className="public-section closing">
        <div className="closing-card">
          <span className="eyebrow">SOMETHING TO LOOK FORWARD TO</span>
          <h2>
            Your next stay<br />
            is waiting for <em>you.</em>
          </h2>
          <p>Experience personalized luxury, world-class suites, and effortless comfort.</p>
          <Link to="/rooms" className="button button-primary">
            Find a room <Icon name="arrow-right" />
          </Link>
        </div>
      </section>
    </>
  )
}

export function Rooms() {
  const [params] = useSearchParams()
  const { hotel } = useHotel()
  const initial = Object.fromEntries(params)
  const live = useLive(`/rooms${params.size ? `?${params}` : ''}`)
  const [category, setCategory] = useState('all')

  const rows = live.data?.rooms || []
  const categories = [...new Set(rows.map((r) => r.type))]
  const filtered = category === 'all' ? rows : rows.filter((r) => r.type === category)

  return (
    <>
      <section className="collection-header">
        <span className="eyebrow">FIND YOUR PLACE</span>
        <h1>
          Rooms for <em>every kind of stay.</em>
        </h1>
        <p>Thoughtful spaces. Simple reservations. A warm welcome.</p>
      </section>

      <div className="public-section collection-content">
        <SearchStay key={params.toString()} initial={initial} compact />
        {live.error && <Alert>{live.error}</Alert>}

        <div className="collection-toolbar">
          <div className="filter-chips">
            <button
              className={category === 'all' ? 'selected' : ''}
              onClick={() => setCategory('all')}
            >
              All suites ({rows.length})
            </button>
            {categories.map((v) => (
              <button
                key={v}
                className={category === v ? 'selected' : ''}
                onClick={() => setCategory(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <span>
            {filtered.length} room{filtered.length !== 1 ? 's' : ''}{' '}
            {params.get('checkIn') ? 'available for these dates' : 'in our collection'}
          </span>
        </div>

        {live.loading ? (
          <div className="skeleton-grid">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : filtered.length ? (
          <div className="room-grid">
            {filtered.map((r) => (
              <RoomCard
                key={r._id}
                room={r}
                currency={hotel?.currency}
                query={params.size ? `?${params}` : ''}
              />
            ))}
          </div>
        ) : (
          <Empty title="No rooms match this stay">
            Try adjusting your date range or guest count. Room availability is verified directly against current reservations.
          </Empty>
        )}
      </div>
    </>
  )
}

export function RoomDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { hotel } = useHotel()
  const { user } = useAuth()
  const navigate = useNavigate()

  const live = useLive(`/rooms/${id}`)
  const [form, setForm] = useState({
    checkIn: params.get('checkIn') || addDay(today(hotel?.timezone)),
    checkOut: params.get('checkOut') || addDay(today(hotel?.timezone), 3),
    adults: params.get('adults') || '2',
    children: params.get('children') || '0',
    notes: '',
  })

  const [guest, setGuest] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [key] = useState(() => crypto.randomUUID())
  const [activePhoto, setActivePhoto] = useState(0)

  const room = live.data?.room
  const count = Math.max(0, Math.round((Date.parse(form.checkOut) - Date.parse(form.checkIn)) / 86400000))
  const subtotal = (room?.priceMinor || 0) * (Number.isFinite(count) ? count : 0)
  const taxes = Math.round((subtotal * (hotel?.taxBasisPoints || 0)) / 10000)

  const change = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function reserve(e) {
    e.preventDefault()
    if (!user) {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/rooms/${id}?${new URLSearchParams({
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            adults: form.adults,
            children: form.children,
          })}`
        )}`
      )
      return
    }

    setBusy(true)
    setError('')
    try {
      await request('/bookings', {
        method: 'POST',
        body: { ...form, guest, roomId: id, requestId: key },
      })
      navigate('/my-bookings?reserved=1')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (live.loading) {
    return (
      <div className="public-section">
        <div className="skeleton-card" style={{ height: '400px' }} />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="public-section">
        <Alert>{live.error || 'Suite not found.'}</Alert>
        <Link to="/rooms" className="button">
          Back to rooms
        </Link>
      </div>
    )
  }

  return (
    <div className="public-section room-detail">
      <Link className="back-link" to="/rooms">
        <Icon name="arrow-left" /> All rooms & suites
      </Link>

      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {room.type} · ROOM {room.number}
          </span>
          <h1>{room.title}</h1>
          <p>
            <Icon name="people" /> Up to {room.capacity.adults} adults · {room.capacity.children} children{' '}
            <span> / </span> Floor {room.floor}
          </p>
        </div>
        <div className="text-right">
          <strong>{money(room.priceMinor, hotel?.currency)}</strong>
          <span className="d-block text-muted small"> / night</span>
        </div>
      </div>

      <div className="detail-gallery">
        <RoomImage src={room.images[activePhoto]} title={room.title} />
        {room.images.length > 1 && (
          <div className="gallery-thumbs">
            {room.images.map((url, i) => (
              <button
                className={i === activePhoto ? 'active' : ''}
                key={url}
                onClick={() => setActivePhoto(i)}
                aria-label={`View room photo ${i + 1}`}
              >
                <RoomImage src={url} title={room.title} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detail-columns">
        <div className="detail-copy">
          <span className="eyebrow">A SPACE TO SETTLE IN</span>
          <h2>Make yourself comfortable.</h2>
          <p>{room.description || 'A welcoming room ready for your next stay.'}</p>

          <h3>Included Suite Amenities</h3>
          <div className="amenity-grid">
            {room.amenities.map((a) => (
              <span key={a}>
                <Icon name="check2-circle" /> {a}
              </span>
            ))}
          </div>

          <div className="policy-box">
            <Icon name="info-circle" />
            <div>
              <strong>A few things to know</strong>
              <p>
                Check-in from {hotel?.checkInTime}. Check-out by {hotel?.checkOutTime}. Payments are collected directly by the hotel. Unpaid confirmed reservations can be cancelled from your guest account.
              </p>
            </div>
          </div>
        </div>

        <form className="booking-box" onSubmit={reserve}>
          <span className="eyebrow">YOUR STAY STARTS HERE</span>
          <h2>Reserve this room</h2>

          <div className="form-grid">
            <Field label="Check-in">
              <input
                required
                type="date"
                min={today(hotel?.timezone)}
                value={form.checkIn}
                onChange={change('checkIn')}
              />
            </Field>

            <Field label="Check-out">
              <input
                required
                type="date"
                min={addDay(form.checkIn || today())}
                value={form.checkOut}
                onChange={change('checkOut')}
              />
            </Field>

            <Field label="Adults">
              <input
                required
                type="number"
                min="1"
                max={room.capacity.adults}
                value={form.adults}
                onChange={change('adults')}
              />
            </Field>

            <Field label="Children">
              <input
                required
                type="number"
                min="0"
                max={room.capacity.children}
                value={form.children}
                onChange={change('children')}
              />
            </Field>
          </div>

          {user && (
            <>
              <Field label="Guest name">
                <input
                  required
                  minLength="2"
                  maxLength="100"
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                />
              </Field>

              <Field label="Guest email">
                <input
                  type="email"
                  required
                  value={guest.email}
                  onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                />
              </Field>

              <Field label="Phone (optional)">
                <input
                  maxLength="30"
                  type="tel"
                  value={guest.phone}
                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                />
              </Field>

              <Field label="Special requests (optional)">
                <textarea
                  maxLength="1000"
                  placeholder="e.g. Airport transfer, feather-free pillows, early arrival"
                  value={form.notes}
                  onChange={change('notes')}
                />
              </Field>
            </>
          )}

          <div className="price-breakdown">
            <div>
              <span>
                {money(room.priceMinor, hotel?.currency)} × {count || 0} night{count !== 1 ? 's' : ''}
              </span>
              <strong>{money(subtotal, hotel?.currency)}</strong>
            </div>
            <div>
              <span>Taxes & Fees</span>
              <strong>{money(taxes, hotel?.currency)}</strong>
            </div>
            <div className="price-total">
              <span>Total amount</span>
              <strong>{money(subtotal + taxes, hotel?.currency)}</strong>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          <button
            className="button button-primary button-full"
            disabled={busy || count < 1 || count > 365 || room.state === 'maintenance'}
          >
            {busy
              ? 'Confirming availability…'
              : user
              ? 'Confirm reservation'
              : 'Sign in to reserve'}
            <Icon name="arrow-right" />
          </button>

          <small className="booking-hint">
            <Icon name="shield-check" /> No credit card required upfront. Pay upon arrival.
          </small>
        </form>
      </div>
    </div>
  )
}

export function Access({ register = false }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  useEffect(() => {
    setError('')
    setForm({ name: '', email: '', phone: '', password: '', confirm: '' })
  }, [register])

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (register && form.password !== form.confirm) {
      setError('Your passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const user = await (register ? auth.register : auth.login)(form)
      const target = params.get('redirect')
      navigate(
        user.role === 'admin'
          ? '/admin'
          : user.role === 'staff'
          ? '/staff'
          : target && /^\/(rooms(?:\/[^?#]+)?|my-bookings)(?:[?#]|$)/.test(target)
          ? target
          : '/my-bookings',
        { replace: true }
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="access-layout">
      <div className="access-photo">
        <div>
          <span className="eyebrow light">A WARM WELCOME AWAITS</span>
          <h1>
            More than a stay.<br />
            <em>A place to belong.</em>
          </h1>
          <p>
            Your reservations, your service requests,<br />
            your next little escape. All in one place.
          </p>
          <span className="access-photo-credit">HOTELPRO LUXURY HOSPITALITY</span>
        </div>
      </div>

      <section className="access-form">
        <Link to="/" className="back-link">
          <Icon name="arrow-left" /> Back to HotelPro
        </Link>

        <span className="eyebrow">{register ? 'YOUR JOURNEY BEGINS' : 'WELCOME BACK'}</span>
        <h1>{register ? 'Make yourself at home.' : 'Sign in to your account.'}</h1>
        <p>
          {register
            ? 'Create your guest account to reserve and manage your stays.'
            : 'Access your stays, tax statements, and concierge requests.'}
        </p>

        <form onSubmit={submit} className="form-stack">
          {error && <Alert>{error}</Alert>}
          {auth.error && <Alert>{auth.error}</Alert>}

          {register ? (
            <>
              <Field label="Full name">
                <input
                  required
                  minLength="2"
                  maxLength="100"
                  autoComplete="name"
                  placeholder="e.g. Eleanor Vance"
                  value={form.name}
                  onChange={change('name')}
                />
              </Field>

              <div className="form-grid">
                <Field label="Email address">
                  <input
                    required
                    maxLength="160"
                    type="email"
                    autoComplete="username"
                    placeholder="name@domain.com"
                    value={form.email}
                    onChange={change('email')}
                  />
                </Field>

                <Field label="Phone (optional)">
                  <input
                    maxLength="30"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 555 000 0000"
                    value={form.phone}
                    onChange={change('phone')}
                  />
                </Field>
              </div>

              <div className="form-grid">
                <Field
                  label="Password"
                  hint="At least 12 characters."
                >
                  <input
                    required
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={change('password')}
                  />
                </Field>

                <Field label="Confirm password">
                  <input
                    required
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={form.confirm}
                    onChange={change('confirm')}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Email address">
                <input
                  required
                  maxLength="160"
                  type="email"
                  autoComplete="username"
                  placeholder="name@domain.com"
                  value={form.email}
                  onChange={change('email')}
                />
              </Field>

              <Field label="Password">
                <input
                  required
                  type="password"
                  minLength={1}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={change('password')}
                />
              </Field>
            </>
          )}

          <button className="button button-primary button-full" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create my account' : 'Sign in'}
            <Icon name="arrow-right" />
          </button>
        </form>

        <p className="access-switch">
          {register ? 'Already have an account?' : 'Your first time here?'}{' '}
          <Link to={`${register ? '/login' : '/register'}${params.size ? `?${params}` : ''}`}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>

        <div className="secure-note">
          <Icon name="shield-lock" /> Encrypted session · Protected authentication
        </div>
      </section>
    </div>
  )
}
