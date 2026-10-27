export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined })
  let result
  try { result = await response.json() } catch { throw new Error('The server returned an unexpected response. Please refresh and try again.') }
  if (!response.ok) { const error = new Error(result.message || 'This request could not be completed.'); error.status = response.status; if (response.status === 401) window.dispatchEvent(new Event('hotelpro:expired')); throw error }
  return result
}
