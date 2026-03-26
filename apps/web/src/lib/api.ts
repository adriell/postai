import axios from 'axios'

// Usa URL relativa para que o rewrite do Next.js faça o proxy para a API.
// Em dev: next.config.js redireciona /api/* → localhost:3011
// Em prod: next.config.js redireciona /api/* → Railway (via INTERNAL_API_URL)
//
// withCredentials: true garante que o cookie httpOnly (postai_token)
// seja enviado automaticamente em todas as requisições.
export const api = axios.create({
  baseURL:         '',
  timeout:         30_000,
  withCredentials: true,
})

// Redireciona para login em 401 (token expirado ou inválido)
api.interceptors.response.use(
  undefined,
  async (err: any) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Limpa o cookie httpOnly no servidor antes de redirecionar
      await api.post('/api/auth/logout').catch(() => {})
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data.user
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  return data.user
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data.user
}

export async function logout() {
  await api.post('/api/auth/logout').catch(() => {})
}

// ── Generate ──────────────────────────────────────────────────
export interface GenerateParams {
  image: File
  nicho: string
  tone: string
  language?: string
  extra?: string
}

export interface Variation {
  tone_label: string
  caption: string
  hashtags: string[]
}

export interface GenerateResult {
  id: string
  variations: Variation[]
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
