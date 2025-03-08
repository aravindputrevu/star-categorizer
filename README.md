# Star Categorizer

A tool that uses AI to categorize your GitHub starred repositories into meaningful groups.

## Deployment to Cloudflare Workers

The application is configured to deploy to Cloudflare Pages/Workers for optimal performance and scalability.

### Prerequisites

- A Cloudflare account
- GitHub Action secrets set up in your repository:
  - `GITHUB_ACCESS_TOKEN`: Your GitHub access token to fetch repository data
  - `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude
  - `CLOUDFLARE_API_TOKEN`: Token with Pages deployment permission
  - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### Manual Deployment

You can manually deploy to Cloudflare Pages using these commands:

```bash
# Build Next.js project
npm run build

# Prepare for Cloudflare Pages
npm run pages:build

# Deploy to Cloudflare Pages
npm run pages:deploy
```

### Automatic Deployment

The GitHub workflow configuration will automatically deploy your application to Cloudflare Pages whenever you push to the main branch.

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
- Anthropic Claude API
- GitHub API (Octokit)