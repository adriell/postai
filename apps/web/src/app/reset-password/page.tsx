'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

function ResetPasswordForm() {
  const params   = useSearchParams()
  const router   = useRouter()
  const token    = params.get('token') || ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    if (!token) { setError('Token inválido'); return }

    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Token inválido ou expirado')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="card text-center max-w-sm w-full">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-gray-600 mb-4">Link inválido ou expirado.</p>
        <Link href="/forgot-password" className="btn-primary w-full py-2.5 block">
          Solicitar novo link
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link href="/" className="text-blue-600 font-bold text-2xl">PostAI</Link>
        <p className="text-gray-500 text-sm mt-1">Criar nova senha</p>
      </div>

      {success ? (
        <div className="card text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Senha redefinida!</h2>
          <p className="text-gray-500 text-sm">Redirecionando para o login...</p>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="Mínimo 8 caracteres" required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="input" placeholder="Repita a senha" required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
