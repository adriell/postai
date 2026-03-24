'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { api } from '@/lib/api'

interface Stats {
  users:            { total: number; this_month: number; verified: number }
  generations:      { total: number; this_month: number; today: number }
  credits_consumed: number
  plans:            Record<string, number>
}

interface AdminUser {
  id:               string
  email:            string
  name:             string
  plan:             string
  credits:          number
  email_verified:   boolean
  is_admin:         boolean
  created_at:       string
  generation_count: number
}

const PLAN_COLORS: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
  agency:  'bg-amber-100 text-amber-700',
}

const PLANS = ['free', 'starter', 'pro', 'agency']

function AdminInner() {
  const router      = useRouter()
  const { user }    = useAuth()
  const [stats, setStats]         = useState<Stats | null>(null)
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading]     = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user && !user.is_admin) router.replace('/dashboard')
  }, [user, router])

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/api/admin/stats')
    setStats(data)
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/users', {
        params: { page, limit: 20, search: search || undefined },
      })
      setUsers(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function changePlan(userId: string, plan: string) {
    setActionLoading(`plan-${userId}`)
    try {
      await api.patch(`/api/admin/users/${userId}/plan`, { plan })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
    } finally {
      setActionLoading(null)
    }
  }

  async function addCredits(userId: string, delta: number) {
    setActionLoading(`credits-${userId}`)
    try {
      const { data } = await api.patch(`/api/admin/users/${userId}/credits`, { delta })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: data.credits } : u))
    } finally {
      setActionLoading(null)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  if (!user?.is_admin) return null

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">PostAI</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar ao app
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Usuários" value={stats.users.total} sub={`+${stats.users.this_month} este mês`} color="blue" />
            <StatCard label="Verificados" value={stats.users.verified}
              sub={`${Math.round(stats.users.verified / Math.max(stats.users.total, 1) * 100)}% do total`} color="green" />
            <StatCard label="Gerações" value={stats.generations.total}
              sub={`${stats.generations.today} hoje`} color="purple" />
            <StatCard label="Créditos usados" value={stats.credits_consumed} sub="total histórico" color="orange" />
          </div>
        )}

        {/* Planos */}
        {stats && (
          <div className="card mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribuição de planos</p>
            <div className="flex flex-wrap gap-3">
              {PLANS.map(p => (
                <div key={p} className={`px-3 py-1.5 rounded-full text-sm font-medium ${PLAN_COLORS[p]}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}: <span className="font-bold">{stats.plans[p] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Usuários <span className="text-sm font-normal text-gray-400">({total})</span>
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="input text-sm w-64"
            />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Buscar</button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2">Limpar</button>
            )}
          </form>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-gray-400">Nenhum usuário encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuário</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Créditos</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Gerações</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Cadastro</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      {/* Usuário */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{u.name || '—'}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="px-4 py-3">
                        <select
                          value={u.plan}
                          onChange={e => changePlan(u.id, e.target.value)}
                          disabled={actionLoading === `plan-${u.id}`}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${PLAN_COLORS[u.plan]}`}
                        >
                          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>

                      {/* Créditos */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900">{u.credits}</span>
                          <button
                            onClick={() => addCredits(u.id, 10)}
                            disabled={actionLoading === `credits-${u.id}`}
                            title="Adicionar 10 créditos"
                            className="text-green-500 hover:text-green-700 font-bold text-base leading-none ml-1 disabled:opacity-40"
                          >+</button>
                          <button
                            onClick={() => addCredits(u.id, -10)}
                            disabled={actionLoading === `credits-${u.id}`}
                            title="Remover 10 créditos"
                            className="text-red-400 hover:text-red-600 font-bold text-base leading-none disabled:opacity-40"
                          >−</button>
                        </div>
                      </td>

                      {/* Gerações */}
                      <td className="px-4 py-3 text-gray-700">{u.generation_count}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.email_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {u.email_verified ? '✓ Verificado' : '⚠ Pendente'}
                        </span>
                        {u.is_admin && (
                          <span className="ml-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
                        )}
                      </td>

                      {/* Cadastro */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ações rápidas */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => addCredits(u.id, 5)}
                            disabled={actionLoading === `credits-${u.id}`}
                            className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 disabled:opacity-40 transition"
                          >+5 créditos</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              Próximo →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[1]}`}>{value.toLocaleString('pt-BR')}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminInner />
    </AuthProvider>
  )
}
