/**
 * Google Gemini Provider
 */
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { LLMProvider, LLMMessage, LLMResponse, LLMProviderConfig, LLMFactory } from '../index';
import { logger } from '@/lib/utils';

// Gemini-specific configuration
export interface GeminiConfig extends LLMProviderConfig {
  // Add any Gemini-specific settings
  topK?: number;
  topP?: number;
}

export class GeminiProvider extends LLMProvider {
  private client: GoogleGenerativeAI;
  private models = {
    default: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    fast: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    powerful: process.env.FALLBACK_GEMINI_MODEL || 'gemini-1.5-pro',
  };

  constructor(config: GeminiConfig) {
    super(config);
    
    if (!config.apiKey && !process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key is required');
    }
    
    this.client = new GoogleGenerativeAI(config.apiKey || process.env.GEMINI_API_KEY as string);
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      // Use specified model or fallback to default
      const modelName = this.config.model || this.models.default;
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: this.config.temperature || 0.2,
          maxOutputTokens: this.config.maxTokens || 4096,
          topK: (this.config as GeminiConfig).topK,
          topP: (this.config as GeminiConfig).topP,
        }
      });
      
      // Extract just the user's message for Gemini
      const lastUserMessage = messages[messages.length - 1].content;
      
      // Use the generateContent method instead of chat for simpler integration
      const result = await model.generateContent(lastUserMessage);
      const response = result.response;
      
      return {
        text: response.text(),
        raw: response,
      };
    } catch (error) {
      logger.error('Gemini provider error', error, { model: this.config.model });
      throw error;
    }
  }
  
  // Helper to switch to more powerful model for complex tasks
  async switchToPowerfulModel(messages: LLMMessage[]): Promise<LLMResponse> {
    const powerfulConfig = {
      ...this.config,
      model: this.models.powerful,
      temperature: 0.7, // Higher temperature for more creative responses
    };
    
    const tempProvider = new GeminiProvider(powerfulConfig as GeminiConfig);
    return tempProvider.chat(messages);
  }
}

// Register the provider with the factory
LLMFactory.registerProvider('gemini', GeminiProvider);