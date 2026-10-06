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
    default: 'claude-opus-5-5',
    fast: 'claude-haiku-4-5',
    powerful: 'claude-opus-5-5',
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
      
      // Call the Anthropic API with proper typing.
      // No temperature: current Claude models (Opus 5.5, Sonnet 5.5) reject sampling parameters.
      const response = await this.client.messages.create({
        model,
        messages: formattedMessages as any, // Type casting to satisfy Anthropic SDK
        max_tokens: this.config.maxTokens || 4096, // Ensure we have a number
      });

      // Current models can return thinking blocks before the answer, so find the text block
      const textBlock = Array.isArray(response.content)
        ? response.content.find(block => block.type === 'text')
        : undefined;

      if (textBlock && 'text' in textBlock) {
        return {
          text: textBlock.text,
          raw: response,
        };
      }

      throw new Error(`Invalid response format from Claude (stop_reason: ${response.stop_reason})`);
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