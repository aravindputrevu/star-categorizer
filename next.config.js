/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
    FALLBACK_LLM_PROVIDER: process.env.FALLBACK_LLM_PROVIDER,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    FALLBACK_CLAUDE_MODEL: process.env.FALLBACK_CLAUDE_MODEL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    FALLBACK_GEMINI_MODEL: process.env.FALLBACK_GEMINI_MODEL,
  },
  // Add Cloudflare compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error:
      // Can't resolve 'fs'
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        encoding: false,
      };
    }

    return config;
  },
}

module.exports = nextConfig