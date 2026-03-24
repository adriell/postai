'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 font-bold text-2xl">PostAI</Link>
          <p className="text-gray-500 text-sm mt-1">Recuperar senha</p>
        </div>

        {sent ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
            <p className="text-gray-500 text-sm mb-4">
              Se existe uma conta com <strong>{email}</strong>, você receberá as instruções em instantes.
            </p>
            <Link href="/login" className="text-blue-600 text-sm hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <div className="card">
            <p className="text-sm text-gray-600 mb-4">
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="seu@email.com" required autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
