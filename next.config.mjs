/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
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
  async headers() {
    return [
      {
        // HTML pages: never cache so the browser always gets fresh chunk references
        source: "/((?!_next/static).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // Static assets have content hashes — safe to cache forever
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
