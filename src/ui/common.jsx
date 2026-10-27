import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../services/api'
export const money = (minor, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format((minor || 0) / 100)
export const pretty = (value = '') => value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/^\w/, (v) => v.toUpperCase())
export const dateLabel = (value) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const addDay = (value, count = 1) => { const d = new Date(`${value}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10) }
export function today(timezone = 'UTC') { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
export function Icon({ name, ...props }) { return <i aria-hidden="true" className={`bi bi-${name}`} {...props} /> }
export function Logo({ dark = false }) { return <Link className={`brand ${dark ? 'brand-light' : ''}`} to="/"><span className="brand-mark"><Icon name="buildings" /></span><span>HotelPro<small>HOSPITALITY, CONSIDERED.</small></span></Link> }
export function Badge({ value }) { return <span className={`badge badge-${value}`}><span />{pretty(value)}</span> }
export function Alert({ children, success = false }) { return children ? <div className={`alert ${success ? 'alert-success' : ''}`} role={success ? 'status' : 'alert'}><Icon name={success ? 'check-circle' : 'exclamation-circle'} />{children}</div> : null }
export function Empty({ title = 'Nothing here yet', children, action }) { return <div className="empty"><span className="empty-icon"><Icon name="inbox" /></span><h3>{title}</h3><p>{children}</p>{action}</div> }
export function Loading({ text = 'Loading your workspace…' }) { return <div className="loading" role="status"><span className="spinner" />{text}</div> }
export function Field({ label, children, hint }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
export function RoomImage({ src, title, className = '' }) { const [failed, setFailed] = useState(false); return src && !failed ? <img className={`room-image ${className}`} src={src} alt={title} loading="lazy" onError={() => setFailed(true)} /> : <div className={`room-image photo-empty ${className}`}><Icon name="door-open" /><span>{title}</span></div> }
export function Modal({ title, subtitle, close, children, wide = false }) {
  const ref = useRef(null), titleId = useId()
  useEffect(() => {
    const previous = document.activeElement
    const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const nodes = () => [...(ref.current?.querySelectorAll('button:not(:disabled), input, select, textarea, a[href]') || [])].filter((n) => n.offsetParent !== null)
    nodes()[0]?.focus()
    const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const all = nodes(), first = all[0], last = all.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() } } }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = bodyOverflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}><header className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={close} aria-label="Close dialog"><Icon name="x-lg" /></button></header>{children}</section></div>
}
export function useLive(path) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const version = useRef(0)
  const reload = useCallback(async () => { const current = ++version.current; try { const value = await request(path); if (version.current === current) { setData(value); setError('') }; return value } catch (e) { if (version.current === current) setError(e.message); throw e } finally { if (version.current === current) setLoading(false) } }, [path])
  useEffect(() => { setLoading(true); setData(null); reload().catch(() => {}); const sync = () => { if (!document.hidden) reload().catch(() => {}) }; const timer = setInterval(sync, 10000); window.addEventListener('focus', sync); return () => { version.current++; clearInterval(timer); window.removeEventListener('focus', sync) } }, [reload])
  return { data, error, loading, reload }
}
const HotelContext = createContext(null)
export function HotelProvider({ children }) { const live = useLive('/hotel'); return <HotelContext.Provider value={{ hotel: live.data?.hotel, ...live }}>{children}</HotelContext.Provider> }
export const useHotel = () => useContext(HotelContext)
export function RoomCard({ room, currency, query = '' }) { return <article className="room-card"><Link to={`/rooms/${room._id}${query}`} className="room-card-photo"><RoomImage src={room.images[0]} title={room.title} /><span className="photo-label">{room.type}</span><span className="photo-arrow"><Icon name="arrow-up-right" /></span></Link><div className="room-card-body"><div className="room-card-meta"><span>ROOM {room.number}</span><span><Icon name="people" /> {room.capacity.adults} adults{room.capacity.children > 0 ? ` · ${room.capacity.children} children` : ''}</span></div><h3><Link to={`/rooms/${room._id}${query}`}>{room.title}</Link></h3><p>{room.description || 'View the room details and select dates for your stay.'}</p><div className="room-card-footer"><div><strong>{money(room.priceMinor, currency)}</strong><small> / night</small></div><Link to={`/rooms/${room._id}${query}`} className="text-button">View room <Icon name="arrow-right" /></Link></div></div></article> }
export function Invoice({ booking: b, close }) {
  const { hotel } = useHotel()
  return <Modal title="Reservation statement" subtitle={b.reference} close={close}><div className="invoice-print"><div className="invoice-brand"><strong>{hotel?.name || 'HotelPro'}</strong><small>{hotel?.address}</small><small>{hotel?.email}</small></div><div className="invoice-columns"><div><small>GUEST</small><strong>{b.guest.name}</strong><span>{b.guest.email}</span></div><div><small>RESERVATION</small><strong>{b.reference}</strong><span>{pretty(b.status)}</span></div></div><div className="receipt-row"><span>{b.roomTitle} · Room {b.roomNumber}</span></div><p>{dateLabel(b.checkIn)} — {dateLabel(b.checkOut)}</p><div className="receipt-row"><span>{b.nights} nights × {money(b.rateMinor, b.currency)}</span><strong>{money(b.subtotalMinor, b.currency)}</strong></div><div className="receipt-row"><span>Configured taxes</span><strong>{money(b.taxMinor, b.currency)}</strong></div><div className="receipt-row receipt-total"><span>Total</span><strong>{money(b.totalMinor, b.currency)}</strong></div><div className="receipt-row"><span>Payments received</span><strong>{money(b.paidMinor, b.currency)}</strong></div><div className="receipt-row"><span>Balance due</span><strong>{money(b.totalMinor - b.paidMinor, b.currency)}</strong></div><p className="muted small">A reservation statement based on recorded hotel activity. Payment is collected by the hotel.</p></div><div className="modal-actions"><button className="button" onClick={close}>Close</button><button className="button button-primary" onClick={() => window.print()}><Icon name="printer" />Print / save PDF</button></div></Modal>
}
