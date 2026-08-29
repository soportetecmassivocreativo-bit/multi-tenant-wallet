/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fija la raíz de trazado a este proyecto (hay otros lockfiles en carpetas padre).
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    // Aumenta el tiempo de espera para Server Actions (por defecto 30s en Vercel, aquí lo dejamos explícito)
    serverActionsBodySizeLimit: "2mb",
  },
};

export default nextConfig;
