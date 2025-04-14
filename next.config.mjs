/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router
  experimental: {
    serverActions: true,
  },
  // Ensure both /app and /pages directories work during migration
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
