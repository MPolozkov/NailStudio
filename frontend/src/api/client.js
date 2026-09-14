const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let token = localStorage.getItem('token') || ''

export function setToken(t) {
  token = t || ''
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function getToken() {
  return token
}

export function isAuthed() {
  return Boolean(token)
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = {}
  }
  if (!res.ok) {
    const err = new Error(data?.detail || 'Ошибка запроса')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  // auth
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  // profile
  getMe: () => request('/api/profile/me'),
  updateMe: (body) => request('/api/profile/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/api/profile/change-password', { method: 'POST', body: JSON.stringify(body) }),
  // masters
  listMasters: () => request('/api/masters'),
  getMaster: (id) => request(`/api/masters/${id}`),
  registerMaster: (body) => request('/api/masters/register', { method: 'POST', body: JSON.stringify(body) }),
  getMyMaster: () => request('/api/masters/me'),
  updateMyMaster: (body) => request('/api/masters/me', { method: 'PUT', body: JSON.stringify(body) }),
  masterClients: (id) => request(`/api/masters/${id}/clients`),
  // services
  createService: (body) => request('/api/services', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id, body) => request(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteService: (id) => request(`/api/services/${id}`, { method: 'DELETE' }),
  // appointments
  createAppointment: (body) => request('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  myAppointments: () => request('/api/appointments/my'),
  deleteAppointment: (id) => request(`/api/appointments/${id}`, { method: 'DELETE' }),
  updateAppointment: (id, body) => request(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getSlots: (masterId, serviceId, date) => request(`/api/appointments/slots/${masterId}/${serviceId}/${date}`),
  // admin
  adminStatus: () => request('/api/admin/status'),
  adminRegister: (body) => request('/api/admin/register', { method: 'POST', body: JSON.stringify(body) }),
  adminOverview: () => request('/api/admin/overview'),
  adminApprove: (id) => request(`/api/masters/${id}/approve`, { method: 'POST' }),
  adminDeleteMaster: (id) => request(`/api/masters/${id}`, { method: 'DELETE' }),
  adminMessage: (body) => request('/api/admin/message', { method: 'POST', body: JSON.stringify(body) }),
}