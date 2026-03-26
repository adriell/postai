'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  file: File
  onApply:  (file: File) => void
  onCancel: () => void
}

interface Adjustments {
  brightness: number  // 50–150, default 100
  contrast:   number  // 50–150, default 100
  saturation: number  // 0–200,  default 100
  sepia:      number  // 0–100,  default 0
  hue:        number  // 0–360,  default 0
}

const DEFAULTS: Adjustments = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, hue: 0 }

interface AiStyle {
  name:  string
  emoji: string
  adj:   Adjustments
}

const AI_STYLES: AiStyle[] = [
  { name: 'Vibrante',      emoji: '✨', adj: { brightness: 105, contrast: 115, saturation: 165, sepia:  0, hue:   0 } },
  { name: 'Cinematográfico', emoji: '🎬', adj: { brightness:  95, contrast: 130, saturation:  75, sepia:  0, hue:   0 } },
  { name: 'Vintage',       emoji: '📷', adj: { brightness: 110, contrast:  90, saturation:  70, sepia: 30, hue:   0 } },
  { name: 'Neon',          emoji: '💜', adj: { brightness: 105, contrast: 135, saturation: 185, sepia:  0, hue:  20 } },
  { name: 'Dourado',       emoji: '🌅', adj: { brightness: 115, contrast: 105, saturation: 130, sepia: 20, hue: -10 } },
  { name: 'Frio',          emoji: '🧊', adj: { brightness: 105, contrast: 110, saturation:  90, sepia:  0, hue: 190 } },
  { name: 'Minimalista',   emoji: '🤍', adj: { brightness: 120, contrast:  85, saturation:  45, sepia:  0, hue:   0 } },
  { name: 'Dramático',     emoji: '🌑', adj: { brightness:  85, contrast: 145, saturation: 110, sepia:  0, hue:   0 } },
]

function cssFilter(a: Adjustments) {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%) sepia(${a.sepia}%) hue-rotate(${a.hue}deg)`
}

export default function ImageEditor({ file, onApply, onCancel }: Props) {
  const [adj, setAdj]           = useState<Adjustments>(DEFAULTS)
  const [preview, setPreview]   = useState('')
  const [applying, setApplying] = useState(false)
  const [activeStyle, setActiveStyle] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function set(key: keyof Adjustments, value: number) {
    setAdj(prev => ({ ...prev, [key]: value }))
    setActiveStyle(null)
  }

  function applyStyle(style: AiStyle) {
    setAdj(style.adj)
    setActiveStyle(style.name)
  }

  function reset() {
    setAdj(DEFAULTS)
    setActiveStyle(null)
  }

  async function apply() {
    const img = imgRef.current
    if (!img) return
    setApplying(true)
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.filter = cssFilter(adj)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob(blob => {
      if (blob) {
        onApply(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }
      setApplying(false)
    }, 'image/jpeg', 0.92)
  }

  const isDefault = JSON.stringify(adj) === JSON.stringify(DEFAULTS)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Editar imagem</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Preview */}
        <div className="bg-gray-900 flex items-center justify-center" style={{ maxHeight: '36vh', overflow: 'hidden' }}>
          {preview && (
            <img
              ref={imgRef}
              src={preview}
              alt="preview"
              crossOrigin="anonymous"
              className="max-w-full max-h-[36vh] object-contain"
              style={{ filter: cssFilter(adj) }}
            />
          )}
        </div>

        {/* AI Styles */}
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estilizar com IA</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {AI_STYLES.map(style => (
              <button
                key={style.name}
                onClick={() => applyStyle(style)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition
                  ${activeStyle === style.name
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <span className="text-base">{style.emoji}</span>
                {style.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="px-4 py-3 space-y-3">
          <Slider label="Brilho"    value={adj.brightness} min={50}  max={150} onChange={v => set('brightness', v)} />
          <Slider label="Contraste" value={adj.contrast}   min={50}  max={150} onChange={v => set('contrast', v)} />
          <Slider label="Saturação" value={adj.saturation} min={0}   max={200} onChange={v => set('saturation', v)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={reset}
            disabled={isDefault}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            Resetar
          </button>
          <button
            onClick={apply}
            disabled={applying}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
          >
            {applying ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">{value}%</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2563eb ${pct}%, #e5e7eb ${pct}%)`
        }}
      />
    </div>
  )
}
