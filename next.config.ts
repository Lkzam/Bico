import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Inclui o arquivo de base de conhecimento do suporte no bundle da função serverless do Vercel.
  // Necessário para que fs.readFileSync funcione em produção.
  outputFileTracingIncludes: {
    '/api/support/chat': ['./src/app/api/support/knowledge-base.md'],
  },
};

// Sentry só é aplicado quando a DSN existe — assim a build atual (sem Sentry)
// fica idêntica e sem risco. Quando NEXT_PUBLIC_SENTRY_DSN for definido na
// Vercel, o wrapper ativa. Upload de source maps só ocorre com SENTRY_AUTH_TOKEN
// (+ SENTRY_ORG/SENTRY_PROJECT); sem ele, é pulado sem quebrar o build.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
