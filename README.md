# Star Categorizer

A tool that uses AI to categorize your GitHub starred repositories into meaningful groups.

## Deployment to Cloudflare Workers

The application is configured to deploy to Cloudflare Pages/Workers for optimal performance and scalability.

### Prerequisites

- A Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

### Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# OR run with Wrangler for Cloudflare compatibility testing
npm run wrangler:build
npm run wrangler:dev
```

### Deployment with Wrangler CLI

You can deploy to Cloudflare Pages using Wrangler CLI:

```bash
# Login to Cloudflare
wrangler login

# Set up secrets
wrangler secret put GITHUB_ACCESS_TOKEN
wrangler secret put ANTHROPIC_API_KEY

# Build and deploy
npm run wrangler:build
npm run wrangler:deploy
```

For detailed Wrangler deployment instructions, see [WRANGLER_DEPLOYMENT.md](./WRANGLER_DEPLOYMENT.md).

### GitHub Actions Deployment

Alternatively, you can use the GitHub workflow configuration which will automatically deploy your application to Cloudflare Pages whenever you push to the main branch. See the workflow file in `.github/workflows/deploy.yml`.

## How It Works

1. User inputs their GitHub username
2. The application fetches all repositories they've starred
3. The starred repos are processed in batches to avoid exceeding token limits
4. Each batch is sent to Claude API to categorize based on repository purpose and technology
5. Results from all batches are merged and displayed to the user

## Technologies Used

- Next.js
- Cloudflare Workers
- Tailwind CSS
- Modular LLM Gateway (supports Claude, Gemini)
- GitHub API (Octokit)

## LLM Gateway

The application uses a modular LLM gateway that allows you to easily switch between different AI providers:

- **Anthropic Claude** (default)
- **Google Gemini**

You can configure which provider to use via environment variables:

```env
# Choose your provider
DEFAULT_LLM_PROVIDER=anthropic  # or "gemini"
```

For detailed instructions on configuring and using the LLM gateway, see [LLM_GATEWAY.md](./LLM_GATEWAY.md).