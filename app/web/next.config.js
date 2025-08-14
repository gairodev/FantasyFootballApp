/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // For Railway deployment, we need to use the public URL, not internal hostname
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If we're in Railway and have a public URL, use it
    if (apiUrl && !apiUrl.includes('railway.internal')) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    
    // Fallback to localhost for local development
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
}

module.exports = nextConfig
