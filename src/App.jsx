import { useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Access, Home, RoomDetail, Rooms } from './ui/Public'
import Guest from './ui/Guest'
import Operations from './ui/Operations'
import { Alert, Icon, Loading, Logo, useHotel } from './ui/common'

function Protected({ children, staff = false, admin = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if ((staff && user.role === 'guest') || (admin && user.role !== 'admin')) return <Navigate to="/my-bookings" replace />
  return children
}

function PublicLayout() {
  const { user, logout } = useAuth()
  const { hotel } = useHotel()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  async function signout() {
    try {
      await logout()
      setOpen(false)
      navigate('/')
    } catch (e) {
      setError(e.message)
    }
  }

  const access = ['/login', '/register'].includes(location.pathname)

  return (
    <>
      <header className="public-nav">
        <div className="nav-inner">
          <Logo />
          <button
            className="menu-toggle icon-button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <Icon name={open ? 'x-lg' : 'list'} />
          </button>
          <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
            <NavLink to="/" end onClick={() => setOpen(false)}>
              Discover
            </NavLink>
            <NavLink to="/rooms" onClick={() => setOpen(false)}>
              Rooms & suites
            </NavLink>
            {user && (
              <NavLink to="/my-bookings" onClick={() => setOpen(false)}>
                My stays
              </NavLink>
            )}
            {user?.role !== 'guest' && user && (
              <NavLink to={user.role === 'admin' ? '/admin' : '/staff'} onClick={() => setOpen(false)}>
                Hotel workspace <Icon name="arrow-up-right" />
              </NavLink>
            )}
            <div className="nav-account">
              {user ? (
                <>
                  <span className="nav-name">
                    <span className="avatar">{user.name.slice(0, 1)}</span>
                    {user.name.split(' ')[0]}
                  </span>
                  <button className="text-button" onClick={signout}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                  <Link className="button button-primary" to="/register" onClick={() => setOpen(false)}>
                    Create account <Icon name="arrow-up-right" />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {error && (
        <div className="nav-error">
          <Alert>{error}</Alert>
        </div>
      )}

      <main className="public-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/login" element={<Access />} />
          <Route path="/register" element={<Access register />} />
          <Route
            path="/my-bookings"
            element={
              <Protected>
                <Guest />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <div className="public-section text-center py-5">
                <h1>This page has checked out.</h1>
                <p className="text-muted">The suite or page you are looking for does not exist.</p>
                <Link className="button button-primary mt-3" to="/">
                  Back to HotelPro
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      {!access && (
        <footer className="public-footer">
          <div className="public-footer-inner">
            <div>
              <Logo dark />
              <p className="footer-tagline">
                A little more comfort.<br />
                A little more care.
              </p>
            </div>

            <div>
              <span>EXPLORE</span>
              <Link to="/rooms">Rooms & suites</Link>
              <Link to="/my-bookings">Your reservations</Link>
              <Link to="/register">Join HotelPro Club</Link>
            </div>

            <div>
              <span>GET IN TOUCH</span>
              {hotel?.email && <a href={`mailto:${hotel.email}`}>{hotel.email}</a>}
              {hotel?.phone && (
                <a href={`tel:${hotel.phone.replace(/[^\d+]/g, '')}`}>{hotel.phone}</a>
              )}
              <p>{hotel?.address || '700 Ocean Drive, Coastal Vista, CA 90291'}</p>
            </div>

            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} {hotel?.name || 'HotelPro Grand Resort'}</span>
              <span>Hospitality, Considered.</span>
            </div>
          </div>
        </footer>
      )}
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Protected admin>
            <Operations />
          </Protected>
        }
      />
      <Route
        path="/staff/*"
        element={
          <Protected staff>
            <Operations />
          </Protected>
        }
      />
      <Route path="*" element={<PublicLayout />} />
    </Routes>
  )
}
