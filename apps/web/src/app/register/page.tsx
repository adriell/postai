'use client'
import { useState } from 'react'
import Link from 'next/link'
import { register } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const { setUser } = useAuth()
  const [form, setForm]           = useState({ name: '', email: '', password: '' })
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [registered, setRegistered] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password)
      setUser(user)
      setUserEmail(form.email)
      setRegistered(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="text-blue-600 font-bold text-2xl">PostAI</Link>
          </div>
          <div className="card text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Confirme seu e-mail</h2>
            <p className="text-gray-500 text-sm mb-4">
              Enviamos um link de verificação para{' '}
              <strong className="text-gray-700">{userEmail}</strong>.
              Clique no link para ativar sua conta.
            </p>
            <p className="text-xs text-gray-400 mb-5">Não encontrou? Verifique a caixa de spam.</p>
            <Link href="/dashboard" className="btn-primary w-full py-2.5 block text-center">
              Continuar para o dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 font-bold text-2xl">PostAI</Link>
          <p className="text-gray-500 text-sm mt-1">Crie sua conta grátis — 5 créditos</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={form.name} onChange={set('name')}
                className="input" placeholder="Seu nome" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="input" placeholder="seu@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={form.password} onChange={set('password')}
                className="input" placeholder="Mínimo 8 caracteres" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
