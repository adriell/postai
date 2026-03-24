import axios from 'axios'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'postai_token'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011',
  timeout: 30_000,
})

// Injeta token em todas as requisições
api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redireciona para login em 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 30, sameSite: 'strict' })
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY)
}

export function getToken() {
  return Cookies.get(TOKEN_KEY)
}

// ── Auth ──────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  setToken(data.token)
  return data.user
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  setToken(data.token)
  return data.user
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data.user
}

// ── Generate ──────────────────────────────────────────────────
export interface GenerateParams {
  image: File
  nicho: string
  tone: string
  language?: string
  extra?: string
}

export interface GenerateResult {
  id: string
  caption: string
  hashtags: string[]
  credits: number
  processedImage: string
}

export async function verifyEmail(token: string) {
  const { data } = await api.get(`/api/auth/verify-email?token=${token}`)
  return data
}

export async function resendVerification() {
  const { data } = await api.post('/api/auth/resend-verification')
  return data
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/api/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/api/auth/reset-password', { token, password })
  return data
}

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const form = new FormData()
  form.append('image',    params.image)
  form.append('nicho',    params.nicho)
  form.append('tone',     params.tone)
  form.append('language', params.language || 'pt-BR')
  if (params.extra) form.append('extra', params.extra)

  const { data } = await api.post('/api/generate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getHistory(page = 1, limit = 20) {
  const { data } = await api.get('/api/generate/history', { params: { page, limit } })
  return data
}

// ── User ─────────────────────────────────────────────────────
export async function getProfile() {
  const { data } = await api.get('/api/user/profile')
  return data.user
}

export async function getCreditsLog() {
  const { data } = await api.get('/api/user/credits/log')
  return data.log
}
