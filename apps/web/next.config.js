/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'standalone' é para builds Docker — não usar no Vercel
  ...(process.env.BUILD_STANDALONE === 'true' && { output: 'standalone' }),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:3011'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
