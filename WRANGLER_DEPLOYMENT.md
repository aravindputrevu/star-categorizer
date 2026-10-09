# Deploying with Wrangler CLI

This guide walks you through deploying the Star Categorizer app using Cloudflare Wrangler CLI.

## Prerequisites

1. Install Wrangler CLI globally:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

## Setting Up Environment Variables

Set up your environment variables as secrets:

```bash
# Set GitHub token
wrangler secret put GITHUB_ACCESS_TOKEN

# Set Anthropic API key
wrangler secret put ANTHROPIC_API_KEY
```

## Local Development with Wrangler

Test your application locally:

```bash
# Build the project for Cloudflare
npm run wrangler:build

# Run local development server
npm run wrangler:dev
```

## Deployment

Deploy your application to Cloudflare Pages:

```bash
# Build and prepare for deployment
npm run wrangler:build

# Deploy to Cloudflare Pages
npm run wrangler:deploy
```

## Optional: Setting Up KV Storage for Caching

If you want to add caching for star data:

1. Create a KV namespace:
```bash
wrangler kv:namespace create "STAR_CACHE"
```

2. Update your wrangler.toml with the generated ID:
```toml
[[kv_namespaces]]
binding = "STAR_CACHE"
id = "your-kv-namespace-id-here"
```

## Troubleshooting

- If you encounter build errors, check for Node.js compatibility issues in dependencies
- Ensure your GITHUB_ACCESS_TOKEN has sufficient permissions for the GitHub API
- Verify your ANTHROPIC_API_KEY is valid and has access to the Claude models used in the app