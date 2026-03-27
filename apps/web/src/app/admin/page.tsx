'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import {
  getAdminStats, getAdminActivity, getAdminNiches, getAdminRecent,
  getAdminUsers, adminUpdateCredits, adminUpdatePlan,
  logout as apiLogout,
  type AdminUser,
} from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────
interface Stats {
  users:            { total: number; this_month: number; verified: number }
  generations:      { total: number; this_month: number; today: number }
  credits_consumed: number
  plans:            Record<string, number>
}

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const PLAN_BADGE: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
  agency:  'bg-amber-100 text-amber-700',
}
const PLAN_BAR: Record<string, string> = {
  free: 'bg-gray-400', starter: 'bg-blue-500', pro: 'bg-purple-500', agency: 'bg-amber-500',
}
const PLAN_ORDER = ['free', 'starter', 'pro', 'agency']

// ── Activity Chart ────────────────────────────────────────────
function ActivityChart({ data }: { data: { day: string; count: number }[] }) {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  const map = Object.fromEntries(data.map(d => [d.day, d.count]))
  const counts = days.map(d => map[d] ?? 0)
  const max = Math.max(...counts, 1)
  const W = 500, H = 80, P = 4

  const pts = counts.map((c, i) => ({
    x: P + (i / (counts.length - 1)) * (W - P * 2),
    y: H - P - (c / max) * (H - P * 2),
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${pts[0].x},${H - P} ${line} ${pts[pts.length - 1].x},${H - P}`
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#actGrad)" />
        <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{days[0].slice(5).replace('-', '/')}</span>
        <span className="text-gray-600 font-medium">{total} gerações no período</span>
        <span>{days[days.length - 1].slice(5).replace('-', '/')}</span>
      </div>
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }: {
  user: AdminUser
  onClose: () => void
  onSaved: (u: AdminUser) => void
}) {
  const [credits, setCredits] = useState(String(user.credits))
  const [plan,    setPlan]    = useState(user.plan)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function save() {
    setSaving(true); setError('')
    try {
      const newCr = parseInt(credits)
      if (isNaN(newCr) || newCr < 0) { setError('Créditos inválidos'); return }
      const delta = newCr - user.credits
      const [credRes, planRes] = await Promise.all([
        delta !== 0    ? adminUpdateCredits(user.id, delta) : Promise.resolve(null),
        plan !== user.plan ? adminUpdatePlan(user.id, plan) : Promise.resolve(null),
      ])
      onSaved({
        ...user,
        credits: credRes ? credRes.credits : user.credits,
        plan:    planRes ? planRes.plan    : user.plan,
      })
    } catch { setError('Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Créditos</label>
            <input type="number" min={0} value={credits} onChange={e => setCredits(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PLAN_ORDER.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub: string; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent}`}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
function AdminInner() {
  const router = useRouter()
  const { user: authUser } = useAuth()

  const [stats,    setStats]    = useState<Stats | null>(null)
  const [activity, setActivity] = useState<{ day: string; count: number }[]>([])
  const [niches,   setNiches]   = useState<{ nicho: string; count: number }[]>([])
  const [recent,   setRecent]   = useState<{ id: string; nicho: string; tone: string; created_at: string; name: string; email: string }[]>([])
  const [users,    setUsers]    = useState<AdminUser[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (authUser && !authUser.is_admin) router.replace('/dashboard')
  }, [authUser, router])

  useEffect(() => {
    Promise.all([
      getAdminStats(), getAdminActivity(), getAdminNiches(), getAdminRecent(), getAdminUsers(1, ''),
    ]).then(([s, a, n, r, u]) => {
      setStats(s); setActivity(a); setNiches(n); setRecent(r)
      setUsers(u.items); setTotal(u.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadUsers = useCallback(async (p: number, q: string) => {
    setUsersLoading(true)
    try {
      const res = await getAdminUsers(p, q)
      setUsers(res.items); setTotal(res.total); setPage(p)
    } finally { setUsersLoading(false) }
  }, [])

  function handleUserSaved(updated: AdminUser) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    setEditUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalPages  = Math.ceil(total / 20)
  const totalUsers  = stats?.users.total ?? 0
  const maxNiche    = niches[0]?.count ?? 1
  const verifiedPct = totalUsers ? Math.round(((stats?.users.verified ?? 0) / totalUsers) * 100) : 0

  return (
    <>
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={handleUserSaved} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-blue-600 font-bold text-lg tracking-tight">PostAI</span>
            <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-100 uppercase tracking-wide">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">
              ← Voltar ao app
            </Link>
            <button
              onClick={async () => { await apiLogout(); window.location.href = '/login' }}
              className="text-sm text-gray-400 hover:text-red-500 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Usuários totais"      value={totalUsers}                     sub={`+${stats?.users.this_month ?? 0} este mês`}                accent="text-blue-600" />
          <KpiCard label="Gerações hoje"        value={stats?.generations.today ?? 0}  sub={`${stats?.generations.total ?? 0} no total`}                accent="text-green-600" />
          <KpiCard label="Créditos consumidos"  value={stats?.credits_consumed ?? 0}   sub={`${stats?.generations.this_month ?? 0} gerações este mês`}   accent="text-purple-700" />
          <KpiCard label="Taxa de verificação"  value={`${verifiedPct}%`}              sub={`${stats?.users.verified ?? 0} verificados`}                 accent="text-amber-600" />
        </div>

        {/* Activity + Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-4">Atividade — últimos 30 dias</p>
            <ActivityChart data={activity} />
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-4">Distribuição de planos</p>
            <div className="space-y-3">
              {PLAN_ORDER.map(plan => {
                const count = stats?.plans[plan] ?? 0
                const pct   = totalUsers ? Math.round((count / totalUsers) * 100) : 0
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium capitalize text-gray-700">{plan}</span>
                      <span className="text-gray-400">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${PLAN_BAR[plan]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Niches + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-4">Top nichos</p>
            {niches.length === 0
              ? <p className="text-sm text-gray-400">Sem dados ainda</p>
              : <div className="space-y-2.5">
                  {niches.map((n, i) => (
                    <div key={n.nicho}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          <span className="text-gray-300 w-4 text-right tabular-nums">{i + 1}.</span>
                          <span className="truncate max-w-[200px]">{n.nicho}</span>
                        </span>
                        <span className="text-gray-400 font-medium tabular-nums">{n.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((n.count / maxNiche) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-4">Gerações recentes</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {recent.length === 0
                ? <p className="text-sm text-gray-400">Sem gerações ainda</p>
                : recent.map(r => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {r.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400 truncate">{r.nicho}</p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(r.created_at)}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-4">
            <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              Usuários <span className="text-gray-400 font-normal text-xs">({total})</span>
            </p>
            <input
              type="search"
              placeholder="Buscar por nome ou e-mail…"
              defaultValue={search}
              onChange={e => {
                const v = e.target.value
                setSearch(v)
                loadUsers(1, v)
              }}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Plano</th>
                  <th className="px-4 py-3 text-right">Créditos</th>
                  <th className="px-4 py-3 text-right">Gerações</th>
                  <th className="px-4 py-3 text-center">Verificado</th>
                  <th className="px-4 py-3 text-left">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersLoading
                  ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Carregando…</td></tr>
                  : users.length === 0
                    ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Nenhum usuário encontrado</td></tr>
                    : users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 leading-tight flex items-center gap-1">
                                  {u.name}
                                  {u.is_admin && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-semibold">admin</span>}
                                </p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[u.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{u.credits}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-500">{u.generation_count}</td>
                          <td className="px-4 py-3 text-center">
                            {u.email_verified
                              ? <span className="text-green-500 font-semibold">✓</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setEditUser(u)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => loadUsers(page - 1, search)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  ← Anterior
                </button>
                <button disabled={page >= totalPages} onClick={() => loadUsers(page + 1, search)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </>
  )
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminInner />
    </AuthProvider>
  )
}
