import { createContext, useContext, useEffect, useState } from 'react'
import { request } from '../services/api'
const Context = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const expired = () => setUser(null)
    window.addEventListener('hotelpro:expired', expired)
    request('/auth/me').then((data) => { if (active) setUser(data.user) }).catch((e) => { if (active && e.status !== 401) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; window.removeEventListener('hotelpro:expired', expired) }
  }, [])
  async function authenticate(kind, data) { const result = await request(`/auth/${kind}`, { method: 'POST', body: data }); setUser(result.user); setError(''); return result.user }
  async function logout() { await request('/auth/logout', { method: 'POST', body: {} }); setUser(null) }
  return <Context.Provider value={{ user, loading, error, setUser, login: (data) => authenticate('login', data), register: (data) => authenticate('register', data), logout }}>{children}</Context.Provider>
}
export const useAuth = () => useContext(Context)
