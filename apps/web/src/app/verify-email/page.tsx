'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); return }

    api.get(`/api/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus('success')
        setTimeout(() => router.push('/dashboard'), 3000)
      })
      .catch(() => setStatus('error'))
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-blue-600 font-bold text-2xl block mb-8">PostAI</Link>

        {status === 'loading' && (
          <div className="card">
            <div className="flex justify-center mb-4">
              <svg className="animate-spin w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
            <p className="text-gray-600">Verificando seu e-mail...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="card">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">E-mail confirmado!</h1>
            <p className="text-gray-500 text-sm mb-4">Sua conta está ativa. Redirecionando para o dashboard...</p>
            <Link href="/dashboard" className="btn-primary w-full py-2.5 block">
              Ir para o dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="card">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
            <p className="text-gray-500 text-sm mb-4">
              Este link expirou ou já foi utilizado. Faça login e solicite um novo e-mail de verificação.
            </p>
            <Link href="/login" className="btn-primary w-full py-2.5 block">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
