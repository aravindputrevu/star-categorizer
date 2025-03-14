/**
 * Modular LLM Gateway Interface
 * 
 * This module provides a unified interface for interacting with different LLM providers.
 * It supports switching between providers like Claude, Gemini, etc. via configuration.
 */

// Message interface (compatible with most LLM providers)
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Common response format for all providers
export interface LLMResponse {
  text: string;
  raw?: any; // Optional raw response from the provider
}

// Provider configuration interface
export interface LLMProviderConfig {
  apiKey?: string;
  model?: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
}

// Type definition for LLMProvider constructor
export type LLMProviderType = new (config: LLMProviderConfig) => LLMProvider;

// LLM Provider abstract class
export abstract class LLMProvider {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = {
      temperature: 0.2,
      maxTokens: 4096,
      ...config,
    };
  }

  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>;
}

// Provider factory
export class LLMFactory {
  private static providers: Map<string, LLMProviderType> = new Map();

  static registerProvider(name: string, provider: LLMProviderType): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  static getProvider(config: LLMProviderConfig): LLMProvider {
    const providerClass = this.providers.get(config.provider.toLowerCase());
    
    if (!providerClass) {
      throw new Error(`LLM provider '${config.provider}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    
    return new providerClass(config);
  }
}

// Dynamically import providers to avoid circular dependencies
// These will be loaded after the LLMProvider and LLMFactory are defined
const loadProviders = async () => {
  await Promise.all([
    import('./providers/anthropic'),
    import('./providers/gemini')
  ]);
};

// Start loading providers immediately
loadProviders();

// Flag to track provider loading status
let providersLoaded = false;

// Ensure providers are loaded before use
async function ensureProvidersLoaded(): Promise<void> {
  if (!providersLoaded) {
    await loadProviders();
    providersLoaded = true;
  }
}

// Get default provider based on environment variables
export function getDefaultLLMProvider(): LLMProvider {
  // Default to Anthropic/Claude if no provider specified
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'anthropic';
  let config: LLMProviderConfig;
  
  switch (defaultProvider.toLowerCase()) {
    case 'gemini':
      config = {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
      break;
    case 'anthropic':
    default:
      config = {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      };
      break;
  }
  
  // Ensure providers are loaded before returning
  if (!providersLoaded) {
    console.log('Providers not yet loaded, initializing synchronously');
    // For synchronous usage, we need to ensure providers are registered
    // This forces synchronous initialization which is not ideal but ensures functionality
    try {
      require('./providers/anthropic');
      require('./providers/gemini');
      providersLoaded = true;
    } catch (error) {
      console.error('Error loading providers synchronously:', error);
    }
  }
  
  return LLMFactory.getProvider(config);
}

// Create a client with specific configuration
export function createLLMClient(config: LLMProviderConfig): LLMProvider {
  // Ensure providers are loaded before returning
  if (!providersLoaded) {
    console.log('Providers not yet loaded, initializing synchronously');
    // For synchronous usage, we need to ensure providers are registered
    try {
      require('./providers/anthropic');
      require('./providers/gemini');
      providersLoaded = true;
    } catch (error) {
      console.error('Error loading providers synchronously:', error);
    }
  }
  
  return LLMFactory.getProvider(config);
}