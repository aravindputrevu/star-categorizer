/**
 * Anthropic Claude Provider
 */
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMResponse, LLMProviderConfig, LLMFactory } from '../index';
import { logger } from '@/lib/utils';

// Anthropic-specific configuration
export interface AnthropicConfig extends LLMProviderConfig {
  // Add any Claude-specific settings
  topK?: number;
  topP?: number;
}

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;
  private models = {
    default: 'claude-3-haiku-20240307',
    fast: 'claude-3-haiku-20240307',
    powerful: 'claude-3-sonnet-20240229',
  };

  constructor(config: AnthropicConfig) {
    super(config);
    
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is required');
    }
    
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      // Format messages for Anthropic API
      const formattedMessages = messages.map(msg => ({
        role: msg.role as any, // Anthropic SDK expects specific roles
        content: msg.content
      }));
      
      // Use specified model or fallback to default
      const model = this.config.model || this.models.default;
      
      // Call the Anthropic API with proper typing
      const response = await this.client.messages.create({
        model,
        messages: formattedMessages as any, // Type casting to satisfy Anthropic SDK
        max_tokens: this.config.maxTokens || 4096, // Ensure we have a number
        temperature: this.config.temperature || 0.2, // Ensure we have a number
      });
      
      // Check if response is valid and has content
      if (Array.isArray(response.content) && response.content.length > 0) {
        const content = response.content[0];
        
        if ('text' in content) {
          return {
            text: content.text,
            raw: response,
          };
        }
      }
      
      throw new Error('Invalid response format from Claude');
    } catch (error) {
      logger.error('Claude provider error', error, { model: this.config.model });
      throw error;
    }
  }
  
  // Helper to switch to more powerful model for complex tasks
  async switchToPowerfulModel(messages: LLMMessage[]): Promise<LLMResponse> {
    const powerfulConfig = {
      ...this.config,
      model: this.models.powerful,
      temperature: 0.6, // Higher temperature for more creative responses
    };
    
    const tempProvider = new AnthropicProvider(powerfulConfig as AnthropicConfig);
    return tempProvider.chat(messages);
  }
}

// Register the provider with the factory
LLMFactory.registerProvider('anthropic', AnthropicProvider);