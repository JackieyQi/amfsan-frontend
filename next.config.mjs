/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
