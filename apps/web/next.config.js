/** @type {import('next').NextConfig} */
function normalizeUrl(url) {
  if (!url) return 'http://localhost:3011'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

const nextConfig = {
  reactStrictMode: true,
  // 'standalone' é para builds Docker — não usar no Vercel
  ...(process.env.BUILD_STANDALONE === 'true' && { output: 'standalone' }),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${normalizeUrl(process.env.INTERNAL_API_URL)}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
