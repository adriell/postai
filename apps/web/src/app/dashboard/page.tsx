'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ImageEditor from '@/components/ImageEditor'
import { generate, schedulePost, cancelSchedule, type Variation, type PostFormat } from '@/lib/api'
import { useAuth, AuthProvider } from '@/hooks/useAuth'

const NICHOS = [
  'Artesanato / crochê', 'Restaurante / gastronomia', 'Moda e vestuário',
  'Beleza / estética', 'Fitness / saúde', 'Pet shop', 'Decoração',
  'Educação / cursos', 'Negócio local', 'Tecnologia',
]

const TONES = [
  { label: 'Descontraído',  value: 'descontraído e próximo' },
  { label: 'Profissional',  value: 'profissional e confiante' },
  { label: 'Inspirador',    value: 'inspirador e motivacional' },
  { label: 'Divertido',     value: 'divertido com humor leve' },
  { label: 'Elegante',      value: 'elegante e sofisticado' },
]

const FORMATS: { value: PostFormat; label: string; hint: string }[] = [
  { value: 'feed',     label: 'Feed',     hint: '1:1 · 1080×1080' },
  { value: 'story',    label: 'Story',    hint: '9:16 · 1080×1920' },
  { value: 'portrait', label: 'Portrait', hint: '4:5 · 1080×1350' },
]

const FORMAT_ASPECT: Record<PostFormat, string> = {
  feed:     'aspect-square',
  story:    'aspect-[9/16]',
  portrait: 'aspect-[4/5]',
}

interface Result {
  id: string
  variations: Variation[]
  processedImage: string
  format: PostFormat
}

function DashboardInner() {
  const router             = useRouter()
  const { user, setUser }  = useAuth()
  const fileInputRef       = useRef<HTMLInputElement>(null)

  const [imageFile, setImageFile]  = useState<File | null>(null)
  const [imagePreview, setPreview] = useState<string | null>(null)
  const [nicho, setNicho]          = useState(NICHOS[0])
  const [tone, setTone]            = useState(TONES[0].value)
  const [extra, setExtra]          = useState('')
  const [language, setLanguage]    = useState('pt-BR')
  const [format, setFormat]        = useState<PostFormat>('feed')
  const [editing, setEditing]      = useState(false)
  const [loading, setLoading]      = useState(false)
  const [error, setError]          = useState('')
  const [result, setResult]        = useState<Result | null>(null)
  const [selected, setSelected]    = useState(0)
  const [copied, setCopied]        = useState(false)
  const [scheduleDate, setScheduleDate]   = useState('')
  const [scheduledAt, setScheduledAt]     = useState('')
  const [scheduleLoading, setScheduleLoading] = useState(false)

  const activeVariation: Variation | null = result?.variations?.[selected] ?? null

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  async function handleGenerate() {
    if (!imageFile) { setError('Selecione uma imagem'); return }
    if (!user) { router.push('/login'); return }
    setError('')
    setLoading(true)
    try {
      const res = await generate({ image: imageFile, nicho, tone, language, extra, format })
      setResult({ id: res.id, variations: res.variations, processedImage: res.processedImage, format: res.format })
      setScheduleDate('')
      setScheduledAt('')
      setSelected(0)
      setUser({ ...user, credits: res.credits })
    } catch (err: any) {
      const code = err.response?.data?.code
      if (code === 'NO_CREDITS') {
        setError('Créditos esgotados. Faça upgrade do plano.')
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        setError('Verifique seu e-mail antes de gerar conteúdo.')
      } else {
        setError(err.response?.data?.error || 'Erro ao gerar conteúdo')
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyAll() {
    if (!activeVariation) return
    const text = `${activeVariation.caption}\n\n${activeVariation.hashtags.join(' ')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function shareInstagram() {
    if (!activeVariation) return
    const text = `${activeVariation.caption}\n\n${activeVariation.hashtags.join(' ')}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text }); return } catch {}
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    window.open('https://www.instagram.com', '_blank')
  }

  async function handleSchedule() {
    if (!result || !scheduleDate) return
    setScheduleLoading(true)
    try {
      const res = await schedulePost(result.id, new Date(scheduleDate).toISOString())
      setScheduledAt(res.scheduled_at)
    } catch {
      setError('Erro ao agendar lembrete')
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleCancelSchedule() {
    if (!result) return
    setScheduleLoading(true)
    try {
      await cancelSchedule(result.id)
      setScheduledAt('')
      setScheduleDate('')
    } catch {
      setError('Erro ao cancelar agendamento')
    } finally {
      setScheduleLoading(false)
    }
  }

  // min datetime para o input (agora + 2min)
  const minDate = new Date(Date.now() + 2 * 60_000).toISOString().slice(0, 16)

  if (!user) return null

  return (
    <>
    {editing && imageFile && (
      <ImageEditor
        file={imageFile}
        onApply={file => { handleFile(file); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Gerar post</h1>
          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
            {user.credits} crédito{user.credits !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Upload */}
        <div className="card mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">1 · Foto</p>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-full max-h-56 object-cover rounded-lg" />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={() => setEditing(true)}
                  className="bg-white rounded-full px-2.5 h-7 flex items-center gap-1 shadow text-gray-600 hover:text-blue-600 text-xs font-medium"
                >✏️ Editar</button>
                <button
                  onClick={() => { setImageFile(null); setPreview(null); setResult(null) }}
                  className="bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-500 hover:text-red-500 text-xs font-bold"
                >✕</button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition"
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
            >
              <div className="text-3xl mb-2 opacity-30">📷</div>
              <p className="text-sm text-gray-500">Clique ou arraste a imagem aqui</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WEBP · até 5MB</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Configurações */}
        <div className="card mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">2 · Configurações</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nicho</label>
              <select value={nicho} onChange={e => setNicho(e.target.value)} className="input text-sm">
                {NICHOS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Idioma</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="input text-sm">
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-2">Tom preferido <span className="text-gray-400">(a IA gerará os 3)</span></label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    tone === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-2">Formato</label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f.value} onClick={() => setFormat(f.value)}
                  className={`flex-1 text-xs py-2 px-2 rounded-lg border font-medium transition text-center ${
                    format === f.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="block font-semibold">{f.label}</span>
                  <span className={`block mt-0.5 text-[10px] ${format === f.value ? 'text-blue-100' : 'text-gray-400'}`}>{f.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Detalhe extra <span className="text-gray-400">(opcional)</span></label>
            <input type="text" value={extra} onChange={e => setExtra(e.target.value)}
              className="input text-sm" placeholder="ex: promoção, lançamento, novo produto..." maxLength={300} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        <button onClick={handleGenerate} disabled={loading || !imageFile} className="btn-primary w-full py-3 text-base mb-6">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Gerando 3 variações...
            </span>
          ) : 'Gerar 3 variações de legenda'}
        </button>

        {/* Resultado */}
        {result && activeVariation && (
          <div className="space-y-4">
            {/* Seletor de variações */}
            <div className="card p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Escolha uma variação</p>
              <div className="grid grid-cols-3 gap-2">
                {(result.variations ?? []).map((v, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(i); setCopied(false) }}
                    className={`text-xs py-2 px-3 rounded-lg border font-medium transition text-left ${
                      selected === i
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="block font-semibold">{v.tone_label}</span>
                    <span className={`block mt-0.5 text-[10px] ${selected === i ? 'text-blue-100' : 'text-gray-400'}`}>
                      {v.caption.slice(0, 40)}…
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview estilo Instagram */}
            <div className="card overflow-hidden p-0">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-none">{user.name ?? 'você'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{nicho}</p>
                </div>
                <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                  {activeVariation.tone_label}
                </span>
              </div>

              <img src={result.processedImage} alt="post" className={`w-full ${FORMAT_ASPECT[result.format]} object-cover`} />

              <div className="px-4 pt-3 pb-1 flex gap-3 text-gray-500 text-lg">
                <span>🤍</span><span>💬</span><span>📤</span>
              </div>

              <div className="px-4 pb-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  <span className="font-semibold text-gray-900">{user.name ?? 'você'} </span>
                  {activeVariation.caption}
                </p>
                <p className="text-sm text-blue-500 mt-2 leading-relaxed">
                  {activeVariation.hashtags.join(' ')}
                </p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyAll}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {copied ? <><span>✓</span> Copiado!</> : <><span>📋</span> Copiar tudo</>}
              </button>
              <button
                onClick={shareInstagram}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white transition"
                style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Compartilhar
              </button>
            </div>

            {/* Agendamento de lembrete */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agendar lembrete por e-mail</p>
              {scheduledAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                    ✓ Agendado para {new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <button
                    onClick={handleCancelSchedule}
                    disabled={scheduleLoading}
                    className="text-xs text-red-500 hover:text-red-700 ml-3"
                  >Cancelar</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    min={minDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="input text-sm flex-1"
                  />
                  <button
                    onClick={handleSchedule}
                    disabled={scheduleLoading || !scheduleDate}
                    className="btn-primary px-4 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {scheduleLoading ? '…' : 'Agendar'}
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleGenerate} disabled={loading} className="btn-secondary w-full py-2.5 text-sm">
              Gerar novas variações
            </button>
          </div>
        )}
      </main>
    </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardInner />
    </AuthProvider>
  )
}
