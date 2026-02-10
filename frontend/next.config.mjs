/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  typescript: {
      ignoreBuildErrors: true,
  },
  images: {
      unoptimized: true,
  },
};

export default nextConfig;
