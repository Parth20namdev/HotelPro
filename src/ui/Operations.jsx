import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { request } from '../services/api'
import { Alert, Badge, dateLabel, Empty, Icon, Invoice, Loading, Modal, money, pretty, useLive } from './common'
import { BookingForm, GuestForm, PaymentForm, RoomForm, ServiceForm, SettingsForm, StaffForm } from './OpsForms'

export default function Operations() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const state = useLive('/state')
  const [tab, setTab] = useState('front-desk')
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const data = state.data
  const isAdmin = user?.role === 'admin'

  async function mutate(path, method = 'POST', body = {}, successMsg = '') {
    setError('')
    try {
      const result = await request(path, { method, body })
      if (successMsg) {
        setMessage(successMsg)
        setTimeout(() => setMessage(''), 4000)
      }
      await state.reload()
      return result
    } catch (e) {
      setError(e.message)
      throw e
    }
  }

  async function handleBookingStatus(bookingId, status, successMsg) {
    setError('')
    try {
      await request(`/bookings/${bookingId}/status`, { method: 'PATCH', body: { status } })
      setMessage(successMsg)
      setTimeout(() => setMessage(''), 4000)
      await state.reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRoomStatus(roomId, roomState) {
    setError('')
    try {
      await request(`/rooms/${roomId}/status`, { method: 'PATCH', body: { state: roomState } })
      setMessage('Room state updated.')
      setTimeout(() => setMessage(''), 3000)
      await state.reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleArchiveRoom(roomId) {
    if (!window.confirm('Are you sure you want to archive this room?')) return
    setError('')
    try {
      await request(`/rooms/${roomId}`, { method: 'DELETE' })
      setMessage('Room archived successfully.')
      setTimeout(() => setMessage(''), 3000)
      await state.reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleServiceStatus(serviceId, status) {
    setError('')
    try {
      await request(`/services/${serviceId}`, { method: 'PATCH', body: { status } })
      setMessage('Service request updated.')
      setTimeout(() => setMessage(''), 3000)
      await state.reload()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleToggleStaff(staffId, active) {
    setError('')
    try {
      await request(`/staff/${staffId}`, { method: 'PATCH', body: { active } })
      setMessage(`Staff account ${active ? 'activated' : 'deactivated'}.`)
      setTimeout(() => setMessage(''), 3000)
      await state.reload()
    } catch (e) {
      setError(e.message)
    }
  }

  if (state.loading) return <Loading text="Loading hotel workspace…" />

  if (!data) {
    return (
      <div className="ops-container p-4">
        <Alert>{state.error || 'Unable to load hotel workspace.'}</Alert>
        <button className="button button-primary mt-3" onClick={() => state.reload()}>Retry connection</button>
      </div>
    )
  }

  const { hotel, rooms, bookings, services, activity, guests, users, metrics } = data

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filter === 'all' || b.status === filter
    const matchesSearch =
      !search ||
      b.reference.toLowerCase().includes(search.toLowerCase()) ||
      b.guest.name.toLowerCase().includes(search.toLowerCase()) ||
      b.roomNumber.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="ops-layout">
      {/* Top Bar */}
      <header className="ops-header">
        <div className="ops-header-brand">
          <Link to="/" className="brand">
            <span className="brand-mark"><Icon name="buildings" /></span>
            <span>{hotel?.name || 'HotelPro'}<small>HOTEL WORKSPACE</small></span>
          </Link>
          <span className={`badge ${isAdmin ? 'badge-confirmed' : 'badge-checked_in'}`}>
            {user.role.toUpperCase()}
          </span>
        </div>

        <div className="ops-header-actions">
          <div className="ops-user-pill">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <span>{user.name}</span>
          </div>
          <Link to="/" className="button button-small" target="_blank" rel="noreferrer">
            <Icon name="box-arrow-up-right" /> Public site
          </Link>
          <button
            className="button button-small"
            onClick={async () => { await logout(); navigate('/login') }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Metrics Strip */}
      <section className="ops-metrics-strip">
        <div className="ops-metric-card">
          <span className="eyebrow">OCCUPANCY</span>
          <strong>{metrics.occupancy}%</strong>
          <small>{metrics.occupied} of {rooms.length} rooms occupied</small>
        </div>

        <div className="ops-metric-card">
          <span className="eyebrow">FUNDS RECEIVED</span>
          <strong>{money(metrics.collectedMinor, hotel.currency)}</strong>
          <small>Recorded hotel revenue</small>
        </div>

        <div className="ops-metric-card">
          <span className="eyebrow">OUTSTANDING BALANCE</span>
          <strong>{money(metrics.outstandingMinor, hotel.currency)}</strong>
          <small>Payable by active/upcoming stays</small>
        </div>

        <div className="ops-metric-card">
          <span className="eyebrow">HOTEL DATE</span>
          <strong>{data.today}</strong>
          <small>Timezone: {hotel.timezone}</small>
        </div>
      </section>

      {/* Main Workspace Navigation Tabs */}
      <nav className="ops-nav-tabs">
        <button
          className={tab === 'front-desk' ? 'active' : ''}
          onClick={() => { setTab('front-desk'); setFilter('all'); setSearch('') }}
        >
          <Icon name="calendar2-range" /> Front Desk <span>{bookings.length}</span>
        </button>

        <button
          className={tab === 'rooms' ? 'active' : ''}
          onClick={() => { setTab('rooms'); setFilter('all'); setSearch('') }}
        >
          <Icon name="door-open" /> Rooms & Readiness <span>{rooms.length}</span>
        </button>

        <button
          className={tab === 'services' ? 'active' : ''}
          onClick={() => { setTab('services'); setFilter('all'); setSearch('') }}
        >
          <Icon name="bell" /> Services & Housekeeping <span>{services.filter((s) => s.status !== 'completed').length}</span>
        </button>

        <button
          className={tab === 'guests' ? 'active' : ''}
          onClick={() => { setTab('guests'); setSearch('') }}
        >
          <Icon name="people" /> Guest Directory <span>{guests.length}</span>
        </button>

        {isAdmin && (
          <button
            className={tab === 'staff' ? 'active' : ''}
            onClick={() => setTab('staff')}
          >
            <Icon name="person-badge" /> Staff Accounts <span>{users.filter((u) => u.role === 'staff').length}</span>
          </button>
        )}

        <button
          className={tab === 'activity' ? 'active' : ''}
          onClick={() => setTab('activity')}
        >
          <Icon name="clock-history" /> Activity Log
        </button>

        {isAdmin && (
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            <Icon name="gear" /> Property Settings
          </button>
        )}
      </nav>

      {/* Status Notifications */}
      <div className="ops-content">
        <Alert success>{message}</Alert>
        <Alert>{error || state.error}</Alert>

        {/* TAB: FRONT DESK */}
        {tab === 'front-desk' && (
          <div className="ops-panel">
            <div className="ops-toolbar">
              <div className="ops-toolbar-filters">
                <input
                  type="search"
                  placeholder="Search reference, guest, room…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ops-search-input"
                />
                <div className="filter-chips">
                  {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      className={filter === st ? 'selected' : ''}
                      onClick={() => setFilter(st)}
                    >
                      {pretty(st)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="button button-primary"
                onClick={() => setModal({ type: 'new-booking' })}
              >
                <Icon name="plus-lg" /> New Reservation
              </button>
            </div>

            {filteredBookings.length ? (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Reservation</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Stay Schedule</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b._id}>
                        <td>
                          <strong>{b.reference}</strong>
                          <small className="d-block text-muted">{new Date(b.createdAt).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <div><strong>{b.guest.name}</strong></div>
                          <small className="text-muted">{b.guest.email} · {b.guest.phone || 'No phone'}</small>
                        </td>
                        <td>
                          <div><strong>Room {b.roomNumber}</strong></div>
                          <small className="text-muted">{b.roomTitle}</small>
                        </td>
                        <td>
                          <div>{dateLabel(b.checkIn)} → {dateLabel(b.checkOut)}</div>
                          <small className="text-muted">{b.nights} night{b.nights > 1 ? 's' : ''} · {b.adults} adult{b.adults > 1 ? 's' : ''}</small>
                        </td>
                        <td>
                          <div><strong>{money(b.totalMinor, b.currency)}</strong></div>
                          <small className={b.paidMinor >= b.totalMinor ? 'text-success' : 'text-danger'}>
                            {b.paidMinor >= b.totalMinor ? 'Settled' : `${money(b.totalMinor - b.paidMinor, b.currency)} due`}
                          </small>
                        </td>
                        <td><Badge value={b.status} /></td>
                        <td className="text-right">
                          <div className="ops-action-buttons">
                            <button
                              className="button button-small"
                              title="View and print statement"
                              onClick={() => setModal({ type: 'invoice', booking: b })}
                            >
                              <Icon name="receipt" />
                            </button>

                            {['confirmed', 'checked_in'].includes(b.status) && b.paidMinor < b.totalMinor && (
                              <button
                                className="button button-small"
                                onClick={() => setModal({ type: 'payment', booking: b })}
                              >
                                Record payment
                              </button>
                            )}

                            {b.status === 'confirmed' && (
                              <button
                                className="button button-primary button-small"
                                onClick={() => handleBookingStatus(b._id, 'checked_in', `${b.reference} checked in successfully.`)}
                              >
                                Check in
                              </button>
                            )}

                            {b.status === 'checked_in' && (
                              <button
                                className="button button-primary button-small"
                                disabled={b.paidMinor < b.totalMinor}
                                title={b.paidMinor < b.totalMinor ? 'Settle balance before checking out' : 'Check out guest'}
                                onClick={() => handleBookingStatus(b._id, 'checked_out', `${b.reference} checked out. Room marked for cleaning.`)}
                              >
                                Check out
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No reservations match your filters">
                All guest bookings appear here with live balance and check-in controls.
              </Empty>
            )}
          </div>
        )}

        {/* TAB: ROOMS & READINESS */}
        {tab === 'rooms' && (
          <div className="ops-panel">
            <div className="ops-toolbar">
              <div>
                <h2>Room Inventory & Readiness</h2>
                <p className="text-muted small">Update housekeeping states, edit room configurations, or add new suites.</p>
              </div>

              {isAdmin && (
                <button
                  className="button button-primary"
                  onClick={() => setModal({ type: 'new-room' })}
                >
                  <Icon name="plus-lg" /> Add Room
                </button>
              )}
            </div>

            <div className="ops-rooms-grid">
              {rooms.map((room) => (
                <article key={room._id} className="ops-room-card">
                  <div className="ops-room-card-head">
                    <div>
                      <span className="eyebrow">ROOM {room.number} · FLOOR {room.floor}</span>
                      <h3>{room.title}</h3>
                      <small className="text-muted">{room.type}</small>
                    </div>
                    <Badge value={room.state} />
                  </div>

                  <p className="small text-muted">{room.description || 'No description provided.'}</p>

                  <div className="ops-room-card-meta">
                    <span><Icon name="people" /> Max {room.capacity.adults}A, {room.capacity.children}C</span>
                    <strong>{money(room.priceMinor, hotel.currency)} / night</strong>
                  </div>

                  <div className="ops-room-card-actions">
                    <label className="small text-muted d-block mb-1">Room Readiness:</label>
                    <select
                      value={room.state}
                      onChange={(e) => handleRoomStatus(room._id, e.target.value)}
                      className="ops-status-select"
                    >
                      <option value="available">🟢 Available for Check-in</option>
                      <option value="cleaning">🟡 Housekeeping / Cleaning</option>
                      <option value="maintenance">⚪ Maintenance Out of Service</option>
                    </select>

                    {isAdmin && (
                      <div className="button-row mt-2">
                        <button
                          className="button button-small"
                          onClick={() => setModal({ type: 'edit-room', room })}
                        >
                          <Icon name="pencil" /> Edit
                        </button>
                        <button
                          className="button button-small text-danger"
                          onClick={() => handleArchiveRoom(room._id)}
                        >
                          <Icon name="trash" /> Archive
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SERVICES & HOUSEKEEPING */}
        {tab === 'services' && (
          <div className="ops-panel">
            <div className="ops-toolbar">
              <div>
                <h2>Housekeeping & Guest Requests</h2>
                <p className="text-muted small">Manage guest assistance tickets, linen requests, and room cleaning queues.</p>
              </div>

              <button
                className="button button-primary"
                onClick={() => setModal({ type: 'new-service' })}
              >
                <Icon name="plus-lg" /> Create Service Ticket
              </button>
            </div>

            {services.length ? (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Type & Priority</th>
                      <th>Details</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s._id}>
                        <td><strong>Room {s.roomNumber}</strong></td>
                        <td>
                          <div><strong>{s.type}</strong></div>
                          {s.priority === 'urgent' && <span className="badge badge-cancelled">URGENT</span>}
                        </td>
                        <td><p className="small mb-0">{s.notes}</p></td>
                        <td>
                          <div>{s.guestName}</div>
                          <small className="text-muted">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        </td>
                        <td><Badge value={s.status} /></td>
                        <td><small>{s.assignedTo || 'Unassigned'}</small></td>
                        <td className="text-right">
                          <div className="ops-action-buttons">
                            {s.status === 'pending' && (
                              <button
                                className="button button-small"
                                onClick={() => handleServiceStatus(s._id, 'in_progress')}
                              >
                                Take ticket
                              </button>
                            )}
                            {s.status === 'in_progress' && (
                              <button
                                className="button button-primary button-small"
                                onClick={() => handleServiceStatus(s._id, 'completed')}
                              >
                                Mark completed
                              </button>
                            )}
                            {['pending', 'in_progress'].includes(s.status) && (
                              <button
                                className="button button-small text-danger"
                                onClick={() => handleServiceStatus(s._id, 'cancelled')}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No open service tickets">
                Guest housekeeping and maintenance requests will show here in real-time.
              </Empty>
            )}
          </div>
        )}

        {/* TAB: GUESTS */}
        {tab === 'guests' && (
          <div className="ops-panel">
            <div className="ops-toolbar">
              <input
                type="search"
                placeholder="Search guests by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ops-search-input"
              />

              <button
                className="button button-primary"
                onClick={() => setModal({ type: 'new-guest' })}
              >
                <Icon name="plus-lg" /> Add Guest Profile
              </button>
            </div>

            {guests.length ? (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Guest Name</th>
                      <th>Contact Email</th>
                      <th>Phone</th>
                      <th>Private Notes</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests
                      .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email.toLowerCase().includes(search.toLowerCase()))
                      .map((g) => (
                        <tr key={g._id}>
                          <td><strong>{g.name}</strong></td>
                          <td>{g.email}</td>
                          <td>{g.phone || '—'}</td>
                          <td><small className="text-muted">{g.notes || 'No notes'}</small></td>
                          <td className="text-right">
                            <button
                              className="button button-small"
                              onClick={() => setModal({ type: 'edit-guest', guest: g })}
                            >
                              <Icon name="pencil" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No guest profiles yet">
                Guests who make reservations are automatically added to this directory.
              </Empty>
            )}
          </div>
        )}

        {/* TAB: STAFF ACCOUNTS (ADMIN ONLY) */}
        {tab === 'staff' && isAdmin && (
          <div className="ops-panel">
            <div className="ops-toolbar">
              <div>
                <h2>Hotel Staff Accounts</h2>
                <p className="text-muted small">Manage staff members authorized to operate the front desk and resolve guest tickets.</p>
              </div>

              <button
                className="button button-primary"
                onClick={() => setModal({ type: 'new-staff' })}
              >
                <Icon name="plus-lg" /> Add Staff Member
              </button>
            </div>

            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Account Control</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.role !== 'guest')
                    .map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.email}</td>
                        <td><Badge value={m.role} /></td>
                        <td>
                          <span className={`badge ${m.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                            {m.active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="text-right">
                          {m.role === 'staff' && (
                            <button
                              className={`button button-small ${m.active ? 'text-danger' : 'button-primary'}`}
                              onClick={() => handleToggleStaff(m.id, !m.active)}
                            >
                              {m.active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ACTIVITY & AUDIT */}
        {tab === 'activity' && (
          <div className="ops-panel">
            <div className="panel-heading mb-3">
              <div>
                <h2>Audit Log & Live Operations Trail</h2>
                <p className="text-muted small">Chronological record of recent reservations, check-ins, payments, and inventory modifications.</p>
              </div>
            </div>

            {activity?.length ? (
              <div className="activity-list">
                {activity.map((act) => (
                  <div key={act._id} className="activity-item">
                    <span className="activity-icon"><Icon name="clock" /></span>
                    <div className="activity-body">
                      <div><strong>{act.actor}</strong>: {act.description}</div>
                      <small className="text-muted">{new Date(act.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No recent activity logged" />
            )}
          </div>
        )}

        {/* TAB: PROPERTY SETTINGS (ADMIN ONLY) */}
        {tab === 'settings' && isAdmin && (
          <SettingsForm hotel={hotel} mutate={mutate} />
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'new-booking' && (
        <Modal title="Create New Reservation" subtitle="Front Desk Direct Booking" close={() => setModal(null)} wide>
          <BookingForm data={data} mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'payment' && (
        <Modal title="Record Received Payment" subtitle={modal.booking.reference} close={() => setModal(null)}>
          <PaymentForm booking={modal.booking} mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'invoice' && (
        <Invoice booking={modal.booking} close={() => setModal(null)} />
      )}

      {modal?.type === 'new-room' && (
        <Modal title="Add New Suite to Inventory" close={() => setModal(null)} wide>
          <RoomForm mutate={mutate} close={() => setModal(null)} currency={hotel.currency} />
        </Modal>
      )}

      {modal?.type === 'edit-room' && (
        <Modal title="Edit Room Details" subtitle={`Room #${modal.room.number}`} close={() => setModal(null)} wide>
          <RoomForm room={modal.room} mutate={mutate} close={() => setModal(null)} currency={hotel.currency} />
        </Modal>
      )}

      {modal?.type === 'new-service' && (
        <Modal title="Create Service Ticket" close={() => setModal(null)}>
          <ServiceForm rooms={rooms} mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'new-guest' && (
        <Modal title="New Guest Profile" close={() => setModal(null)}>
          <GuestForm mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'edit-guest' && (
        <Modal title="Edit Guest Profile" subtitle={modal.guest.name} close={() => setModal(null)}>
          <GuestForm guest={modal.guest} mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'new-staff' && (
        <Modal title="Create Staff Account" close={() => setModal(null)}>
          <StaffForm mutate={mutate} close={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}
