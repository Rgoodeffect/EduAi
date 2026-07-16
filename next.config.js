/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "pdf-parse", "chromadb"],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
