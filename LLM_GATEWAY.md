# LLM Gateway for Star Categorizer

This document explains how to configure and use the LLM (Large Language Model) gateway in the Star Categorizer application.

## Overview

The Star Categorizer application uses a modular LLM gateway that allows you to easily switch between different LLM providers without changing the application code. Currently supported providers include:

- **Anthropic Claude** (claude-3-haiku, claude-3-sonnet)
- **Google Gemini** (gemini-1.5-flash, gemini-1.5-pro)

## Configuration

Configuration is managed through environment variables. You can set these in your `.env.local` file.

### Basic Configuration

```env
# Choose your default provider: "anthropic" or "gemini"
DEFAULT_LLM_PROVIDER=anthropic
FALLBACK_LLM_PROVIDER=anthropic

# API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Advanced Configuration

You can also specify which models to use:

```env
# Anthropic Claude configuration
CLAUDE_MODEL=claude-3-haiku-20240307
FALLBACK_CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Google Gemini configuration
GEMINI_MODEL=gemini-1.5-flash
FALLBACK_GEMINI_MODEL=gemini-1.5-pro
```

## How It Works

1. The application uses the default LLM provider specified by `DEFAULT_LLM_PROVIDER`.
2. For each repository categorization task, it first attempts to use the specified model.
3. If categorization fails, it falls back to a more powerful model specified by the fallback configuration.
4. All responses are cached to improve performance.

## Implementation Details

The LLM gateway is implemented in the `lib/llm` directory:

- `index.ts` - Core interface and factory pattern
- `providers/` - Individual provider implementations
  - `anthropic.ts` - Anthropic Claude provider
  - `gemini.ts` - Google Gemini provider

## Adding a New Provider

To add support for a new LLM provider:

1. Create a new file in `lib/llm/providers/` (e.g., `openai.ts`)
2. Implement the provider class extending `LLMProvider`
3. Register the provider with the factory
4. Update environment variables as needed

Example implementation:

```typescript
import { LLMProvider, LLMMessage, LLMResponse, LLMProviderConfig, LLMFactory } from '../index';

export class NewProvider extends LLMProvider {
  // Implementation here
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Call provider API and return result
  }
}

// Register the provider with the factory
LLMFactory.registerProvider('new-provider', NewProvider);
```

## Performance Considerations

- The faster models (claude-3-haiku, gemini-1.5-flash) are used by default for better performance
- More powerful models are used as fallbacks for complex tasks
- Results are cached to minimize API calls
- Concurrent requests for the same data are deduplicated

## Usage Example

```typescript
import { getDefaultLLMProvider, LLMMessage } from '@/lib/llm';

// Get default provider based on environment variables
const llmClient = getDefaultLLMProvider();

// Use the LLM
const response = await llmClient.chat([
  {
    role: 'user',
    content: 'Your prompt here',
  }
]);

console.log(response.text);
```