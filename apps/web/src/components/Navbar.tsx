'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-blue-600 font-bold text-lg tracking-tight">
          PostAI
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Gerar
              </Link>
              <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900">
                Histórico
              </Link>
              {user.is_admin && (
                <Link href="/admin" className="text-sm text-red-500 hover:text-red-700 font-medium">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {user.credits} créditos
                </span>
                <span className="text-sm text-gray-500">{user.name?.split(' ')[0]}</span>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition">
                  Sair
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm px-3 py-1.5">
                Entrar
              </Link>
              <Link href="/register" className="btn-primary text-sm px-3 py-1.5">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
