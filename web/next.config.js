/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.openfoodfacts.org'],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/new-household',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/foods/new',
        destination: '/inventory/new',
        permanent: false,
      },
      {
        source: '/foods/:path*',
        destination: '/inventory',
        permanent: false,
      },
      {
        source: '/storage/:path*',
        destination: '/inventory',
        permanent: false,
      },
      {
        source: '/storage',
        destination: '/inventory',
        permanent: false,
      },
      {
        source: '/household/:path*',
        destination: '/more',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/more',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/more',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/more',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
