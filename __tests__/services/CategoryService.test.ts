import { CategoryService } from '@/lib/services/CategoryService';
import { LLMProvider, LLMMessage, LLMResponse } from '@/lib/llm';
import { CacheService } from '@/lib/services/CacheService';

// Mock LLM Provider for testing
class MockLLMProvider extends LLMProvider {
  private mockResponses: Map<string, LLMResponse> = new Map();
  
  constructor() {
    super({});
  }
  
  setResponseForPrompt(promptPattern: RegExp, response: LLMResponse) {
    this.mockResponses.set(promptPattern.toString(), response);
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Find the user message(s)
    const userMessages = messages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) {
      return { text: 'No user message found' };
    }
    
    // Try to match against our mock responses
    for (const [patternStr, response] of this.mockResponses.entries()) {
      const pattern = new RegExp(patternStr.slice(1, -1)); // Remove the /pattern/ delimiters
      
      if (pattern.test(userMessages[userMessages.length - 1].content)) {
        return response;
      }
    }
    
    // Default mock response
    return { 
      text: JSON.stringify({
        "Web Development": ["owner/repo1"],
        "Data Science": ["owner/repo2"]
      })
    };
  }
  
  async switchToPowerfulModel(messages: LLMMessage[]): Promise<LLMResponse> {
    return this.chat(messages);
  }
}

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockLLM: MockLLMProvider;
  let mockCache: CacheService<Record<string, string[]>>;
  
  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    mockCache = new CacheService<Record<string, string[]>>();
    categoryService = new CategoryService(mockLLM, mockCache);
  });
  
  test('should categorize repositories correctly', async () => {
    // Arrange
    const repos = [
      {
        name: 'repo1',
        full_name: 'owner/repo1',
        description: 'A web framework',
        language: 'JavaScript',
        topics: ['web', 'framework'],
        stargazers_count: 1000,
        html_url: 'https://github.com/owner/repo1',
        created_at: '2020-01-01',
        owner: {
          login: 'owner',
          avatar_url: 'https://example.com/avatar.png'
        }
      },
      {
        name: 'repo2',
        full_name: 'owner/repo2',
        description: 'A data science tool',
        language: 'Python',
        topics: ['data-science', 'machine-learning'],
        stargazers_count: 500,
        html_url: 'https://github.com/owner/repo2',
        created_at: '2020-02-01',
        owner: {
          login: 'owner',
          avatar_url: 'https://example.com/avatar.png'
        }
      }
    ];
    
    mockLLM.setResponseForPrompt(/Categorize GitHub repos/, {
      text: JSON.stringify({
        "Web Frameworks": ["owner/repo1"],
        "Data Science": ["owner/repo2"]
      })
    });
    
    // Act
    const result = await categoryService.categorizeRepos(repos, 'testuser');
    
    // Assert
    expect(Object.keys(result)).toContain('Web Frameworks');
    expect(Object.keys(result)).toContain('Data Science');
    expect(result['Web Frameworks']).toContain('owner/repo1');
    expect(result['Data Science']).toContain('owner/repo2');
  });
  
  test('should handle empty repositories list', async () => {
    // Act
    const result = await categoryService.categorizeRepos([], 'testuser');
    
    // Assert
    expect(Object.keys(result).length).toBe(0);
  });
  
  test('should generate developer fact', async () => {
    // Arrange
    mockLLM.setResponseForPrompt(/Generate a short, interesting fact/, {
      text: 'Developers drink an average of 2-3 cups of coffee per day.'
    });
    
    // Act
    const fact = await categoryService.generateDevFact();
    
    // Assert
    expect(fact).toBe('Developers drink an average of 2-3 cups of coffee per day.');
  });
});
