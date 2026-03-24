'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { getHistory } from '@/lib/api'
import { AuthProvider } from '@/hooks/useAuth'

interface Generation {
  id: string
  nicho: string
  tone: string
  caption: string
  hashtags: string[]
  created_at: string
}

function HistoryInner() {
  const [items, setItems]     = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getHistory(page, 20)
      .then(data => { setItems(data.items); setTotal(data.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          Histórico <span className="text-gray-400 font-normal text-base">({total})</span>
        </h1>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"/>
                <div className="h-3 bg-gray-100 rounded w-full mb-1"/>
                <div className="h-3 bg-gray-100 rounded w-4/5"/>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-sm">Nenhuma geração ainda.</p>
            <a href="/dashboard" className="btn-primary inline-block mt-4 text-sm">Criar primeiro post</a>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="card cursor-pointer hover:border-blue-200 transition"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.nicho}</span>
                    <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <span className="text-xs text-gray-400">{expanded === item.id ? '▲' : '▼'}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{item.caption?.split('\n')[0]}</p>

                {expanded === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Legenda</p>
                        <button onClick={e => { e.stopPropagation(); copy(item.caption, item.id + '_c') }}
                          className="text-xs text-blue-600 hover:underline">
                          {copied === item.id + '_c' ? '✓ Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Hashtags</p>
                        <button onClick={e => { e.stopPropagation(); copy(item.hashtags?.join(' ') || '', item.id + '_h') }}
                          className="text-xs text-blue-600 hover:underline">
                          {copied === item.id + '_h' ? '✓ Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.hashtags?.map(h => (
                          <span key={h} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-3 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-sm px-4">← Anterior</button>
            <span className="text-sm text-gray-500 self-center">Página {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
              className="btn-secondary text-sm px-4">Próxima →</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <AuthProvider>
      <HistoryInner />
    </AuthProvider>
  )
}
