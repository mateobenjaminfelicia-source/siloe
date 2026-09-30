// ================================================
//  SILOÉ — Configuración de Axios
//  Único punto de contacto con el backend.
//
//  Modo MOCK: activar con VITE_MOCK=true en .env
//  En modo mock todas las llamadas se resuelven
//  localmente sin tocar ningún servidor.
//  Desactivar cuando el backend de Mateo esté listo.
// ================================================

import axios                        from 'axios'
import { IS_MOCK, mockHandlers }    from './mock'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Interceptor de request: JWT automático ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('siloe_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Interceptor de response: mock + errores globales ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el mock está activo, interceptamos el error de red
    // y resolvemos con datos falsos
    if (IS_MOCK && (!error.response || error.code === 'ERR_NETWORK')) {
      const resolved = resolveMock(error.config)
      if (resolved) return Promise.resolve(resolved)
    }

    if (error.response?.status === 401) {
      const isMockToken = localStorage.getItem('siloe_token') === 'mock-jwt-token-demo'
      if (!isMockToken) {
        localStorage.removeItem('siloe_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// También interceptamos requests exitosos en modo mock
// para que nunca lleguen al servidor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('siloe_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  if (IS_MOCK) {
    // Cancelamos el request real y resolvemos con mock
    config.adapter = () => {
      const result = resolveMock(config)
      if (result) return Promise.resolve({ ...result, status: 200, headers: {}, config })
      return Promise.reject(new Error(`Mock no implementado: ${config.method?.toUpperCase()} ${config.url}`))
    }
  }
  return config
})

// ── Resolver mock según método + URL ──
function resolveMock(config) {
  const method  = config.method?.toUpperCase() || 'GET'
  const url     = config.url || ''
  const body    = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data

  // Extraer el ID de la URL (ej: /presentations/5 → id = "5")
  const idMatch = url.match(/\/(\d+)(?:\/|$)/)
  const id      = idMatch?.[1]

  // Normalizar la URL reemplazando IDs numéricos con :id
  const normalizedUrl = url.replace(/\/\d+/g, '/:id')
  const key = `${method} ${normalizedUrl}`

  const handler = mockHandlers[key]
  if (!handler) return null

  try {
    return handler(id, body)
  } catch (e) {
    console.error(`Mock error en ${key}:`, e)
    return null
  }
}

export default api

// ── Funciones de la API por módulo ──

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
}

export const presentationsAPI = {
  generate:    (data)     => api.post('/presentations/generate', data),
  generateStructure: (data) => api.post('/presentations/structure', data),
  finalizePresentation: (structure) => api.post('/presentations/finalize', structure),
  getAll:      ()         => api.get('/presentations/'),
  getById:     (id)       => api.get(`/presentations/${id}`),

  update:      (id, data) => api.put(`/presentations/${id}`, data),
  delete:      (id)       => api.delete(`/presentations/${id}`),
  publish:     (id)       => api.post(`/presentations/${id}/publish`),
  getVersions: (id)       => api.get(`/presentations/${id}/versions`),
  getByToken:  (token, password) => api.get(`/presentations/share/${token}`,
    password ? { headers: { 'X-Share-Password': password } } : {}),
  fork:        (id)       => api.post(`/presentations/${id}/fork`),
}

export const communityAPI = {
  explore: (params) => api.get('/community/', { params }),
  like:    (id)     => api.post(`/community/${id}/like`),
  unlike:  (id)     => api.delete(`/community/${id}/like`),
  save:    (id)     => api.post(`/community/${id}/save`),
  report:  (id, data) => api.post(`/community/${id}/report`, data),
}

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}/profile`),
  getMyProfile: () => api.get('/users/me/profile/'),
  getSaved:   ()   => api.get('/users/me/saved'),
  getCredits: ()   => api.get('/users/me/credits'),
}

export const templatesAPI = {
  getAll: () => api.get('/templates/'),
}

export const donationsAPI = {
  create: (data) => api.post('/donations/', data),
}
