import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inclui o arquivo de base de conhecimento do suporte no bundle da função serverless do Vercel.
  // Necessário para que fs.readFileSync funcione em produção.
  outputFileTracingIncludes: {
    '/api/support/chat': ['./src/app/api/support/knowledge-base.md'],
  },
};

export default nextConfig;
