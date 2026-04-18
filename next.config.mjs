/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid CI/Vercel failing `next build` on ESLint env/plugin differences; run `npm run lint` locally.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
