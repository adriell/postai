import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PostAI — Crie posts para Instagram em segundos',
  description: 'Envie uma foto e receba legenda + hashtags prontas com IA.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
