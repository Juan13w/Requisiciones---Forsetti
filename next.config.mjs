/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: [
      "http://localhost:9091",
      "http://127.0.0.1:9091",
      "http://192.168.100.44:9091",
    ],
  },

  // ✅ Forma compatible con Next.js 15 para ignorar rutas de Watchpack
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          "C:/DumpStack.log.tmp",
          "C:/System Volume Information",
          "C:/pagefile.sys",
          "**/node_modules/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
