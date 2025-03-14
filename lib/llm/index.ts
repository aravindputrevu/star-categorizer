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

// Ensure providers are loaded before use - works in both async and sync contexts
function ensureProvidersLoaded(): boolean {
  if (providersLoaded) return true;
  
  try {
    // First try dynamic import - works in modern JS environments
    import('./providers/anthropic').catch(() => {});
    import('./providers/gemini').catch(() => {});
    
    // Fallback to require for synchronous loading
    require('./providers/anthropic');
    require('./providers/gemini');
    
    providersLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading LLM providers:', error);
    return false;
  }
}

// Get default provider based on environment variables
export function getDefaultLLMProvider(): LLMProvider {
  ensureProvidersLoaded();
  
  // Default to Anthropic/Claude if no provider specified
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'anthropic';
  
  const config: LLMProviderConfig = defaultProvider.toLowerCase() === 'gemini' 
    ? {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10)
      }
    : {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10)
      };
  
  return LLMFactory.getProvider(config);
}

// Create a client with specific configuration
export function createLLMClient(config: LLMProviderConfig): LLMProvider {
  ensureProvidersLoaded();
  return LLMFactory.getProvider(config);
}