/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@builderos/core", "@builderos/types"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb"
    }
  }
};

export default nextConfig;
