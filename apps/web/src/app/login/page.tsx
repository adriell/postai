'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, resendVerification } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router      = useRouter()
  const { setUser } = useAuth()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setLoading(true)
    try {
      const user = await login(email, password)
      setUser(user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await resendVerification()
      setResent(true)
    } catch {
      setError('Erro ao reenviar e-mail. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 font-bold text-2xl">PostAI</Link>
          <p className="text-gray-500 text-sm mt-1">Entre na sua conta</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            {unverified && (
              <div className="bg-yellow-50 text-yellow-700 text-sm px-3 py-2 rounded-lg">
                {resent ? (
                  '✅ E-mail reenviado! Verifique sua caixa de entrada.'
                ) : (
                  <>
                    Seu e-mail ainda não foi verificado.{' '}
                    <button type="button" onClick={handleResend} className="underline font-medium">
                      Reenviar verificação
                    </button>
                  </>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="seu@email.com" required autoFocus
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Esqueci a senha
                </Link>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••" required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Não tem conta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Criar gratuitamente
          </Link>
        </p>
      </div>
    </div>
  )
}
