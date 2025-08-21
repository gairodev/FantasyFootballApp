/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Normalize API URL and allow internal Railway domains
    const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrlRaw) {
      const apiUrl = apiUrlRaw.startsWith('http') ? apiUrlRaw : `http://${apiUrlRaw}`;
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
