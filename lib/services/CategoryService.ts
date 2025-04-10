/**
 * Service for categorizing repositories using LLM
 */

import { StarredRepo } from './GithubService';
import { CacheService } from './CacheService';
import { LLMProvider } from '../llm';
import { logger } from '../utils';
import { AppError } from '../errors';

interface RepoDescription {
  name: string;
  description: string;
  language: string;
  topics: string[];
}

export class CategoryService {
  private llmClient: LLMProvider;
  private cacheService: CacheService<Record<string, string[]>>;
  
  constructor(llmClient: LLMProvider, cacheService: CacheService<Record<string, string[]>>) {
    this.llmClient = llmClient;
    this.cacheService = cacheService;
  }
  
  async categorizeRepos(repos: StarredRepo[], username: string): Promise<Record<string, string[]>> {
    // Try to get from cache first
    const cacheKey = `categories:${username}`;
    const cachedCategories = await this.cacheService.get(cacheKey);
    
    if (cachedCategories) {
      logger.info(`Using cached categories for ${username}`, { 
        categoryCount: Object.keys(cachedCategories).length 
      });
      return cachedCategories;
    }
    
    // Prepare repo descriptions for categorization
    const repoDescriptions = this.prepareRepoDescriptions(repos);
    
    // Analyze complexity and determine optimal batch size
    const complexityScore = this.calculateComplexity(repoDescriptions);
    const batchSize = this.getOptimalBatchSize(complexityScore, repoDescriptions.length);
    
    logger.debug('Using adaptive batch sizing', { 
      batchSize, 
      totalRepos: repoDescriptions.length,
      complexityScore 
    });
    
    // Break repos into batches
    const batches: RepoDescription[][] = [];
    for (let i = 0; i < repoDescriptions.length; i += batchSize) {
      batches.push(repoDescriptions.slice(i, i + batchSize));
    }
    
    logger.info(`Categorizing ${repoDescriptions.length} repos in ${batches.length} batches`);
    
    // Process each batch and merge results
    try {
      const batchResults = await Promise.all(
        batches.map((batch, index) => this.processBatch(batch, index, batches.length))
      );
      
      // Merge all batch results
      const mergedCategories = this.mergeBatchResults(batchResults);
      
      // Cache the results
      await this.cacheService.set(cacheKey, mergedCategories, 1440); // Cache for 24 hours
      
      return mergedCategories;
    } catch (error) {
      logger.error('Error categorizing repos', error);
      throw new AppError('Failed to categorize repositories', 500, { 
        username, 
        repoCount: repos.length 
      });
    }
  }
  
  private prepareRepoDescriptions(repos: StarredRepo[]): RepoDescription[] {
    return repos.map(repo => ({
      name: repo.full_name,
      description: repo.description || '',
      language: repo.language || '',
      topics: repo.topics || []
    }));
  }
  
  private calculateComplexity(repos: RepoDescription[]): number {
    if (repos.length === 0) return 0;
    
    // Calculate average description length
    const avgDescLength = repos.reduce(
      (sum, repo) => sum + (repo.description ? repo.description.length : 0), 
      0
    ) / repos.length;
    
    // Calculate language variety
    const languages = new Set(repos.map(repo => repo.language).filter(Boolean));
    const languageVariety = languages.size / repos.length;
    
    // Calculate topic density
    const topicCount = repos.reduce((sum, repo) => sum + (repo.topics ? repo.topics.length : 0), 0);
    const topicDensity = topicCount / repos.length;
    
    // Combine factors with weights
    const descWeight = 0.4;
    const langWeight = 0.3;
    const topicWeight = 0.3;
    
    // Normalize description length (assume 100 chars is average)
    const normalizedDescLength = Math.min(avgDescLength / 100, 1);
    
    return (
      normalizedDescLength * descWeight + 
      languageVariety * langWeight + 
      topicDensity * topicWeight
    );
  }
  
  private getOptimalBatchSize(complexityScore: number, totalRepos: number): number {
    // Base size on complexity
    let size = 200 - Math.floor(complexityScore * 150); // Range: 50-200
    
    // Adjust for total repo count
    if (totalRepos < 50) {
      return Math.min(totalRepos, size);
    }
    
    // Ensure at least 2 batches for large collections
    if (totalRepos > 300) {
      return Math.min(150, size);
    }
    
    return size;
  }
  
  private async processBatch(
    batch: RepoDescription[], 
    batchIndex: number, 
    totalBatches: number
  ): Promise<Record<string, string[]>> {
    logger.debug(`Processing batch ${batchIndex + 1}/${totalBatches}`, { repoCount: batch.length });
    
    const prompt = this.generateCategoryPrompt(batch);
    
    try {
      const response = await this.llmClient.chat([
        { role: 'system', content: 'You are a helpful assistant that categorizes GitHub repositories.' },
        { role: 'user', content: prompt }
      ]);
      
      // Parse the JSON response
      let categories: Record<string, string[]>;
      try {
        categories = JSON.parse(response.text);
        
        // Validate the response structure
        if (!categories || typeof categories !== 'object') {
          throw new Error('Invalid response format');
        }
        
        logger.debug(`Batch ${batchIndex + 1} categorized successfully`);
        return categories;
      } catch (parseError) {
        logger.error(`Error parsing category response for batch ${batchIndex + 1}`, {
          error: parseError,
          responseText: response.text
        });
        
        // Try to recover with more powerful model
        return await this.retryWithPowerfulModel(batch, batchIndex, totalBatches);
      }
    } catch (error) {
      logger.error(`Error in LLM categorization for batch ${batchIndex + 1}`, error);
      
      // Try to recover with more powerful model
      return await this.retryWithPowerfulModel(batch, batchIndex, totalBatches);
    }
  }
  
  private async retryWithPowerfulModel(
    batch: RepoDescription[], 
    batchIndex: number, 
    totalBatches: number
  ): Promise<Record<string, string[]>> {
    logger.info(`Retrying batch ${batchIndex + 1} with more powerful model`);
    
    try {
      const prompt = this.generateCategoryPrompt(batch, true);
      
      // Use a more powerful model for the retry
      if ('switchToPowerfulModel' in this.llmClient) {
        const response = await this.llmClient.switchToPowerfulModel([
          { role: 'system', content: 'You are a helpful assistant that categorizes GitHub repositories. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ]);
        
        try {
          const categories = JSON.parse(response.text);
          logger.info(`Batch ${batchIndex + 1} recovered successfully with powerful model`);
          return categories;
        } catch (parseError) {
          logger.error('Failed to parse response even with powerful model', {
            responseText: response.text
          });
          // Return empty categories as fallback
          return {};
        }
      } else {
        // If no powerful model available, return empty
        logger.warn('No powerful model available for retry');
        return {};
      }
    } catch (error) {
      logger.error('Failed retry with powerful model', error);
      return {};
    }
  }
  
  private generateCategoryPrompt(batch: RepoDescription[], isRetry: boolean = false): string {
    const repoDescriptions = batch.map(repo => 
      `Repository: ${repo.name}\nDescription: ${repo.description || 'No description'}\nLanguage: ${repo.language || 'Unknown'}\nTopics: ${repo.topics.join(', ') || 'None'}\n`
    ).join('\n');
    
    const formatInstructions = isRetry 
      ? 'Be extra careful to format your response as valid JSON.'
      : '';
    
    return `
Categorize the following GitHub repositories into logical groups based on their purpose, technology, and domain. 
${formatInstructions}

Here are the repositories:

${repoDescriptions}

Create between 5-15 meaningful categories. For each category, list the repositories (by their full names) that belong to it.
A repository can appear in multiple categories if appropriate.

Respond with ONLY a JSON object where keys are category names and values are arrays of repository full names.
Example format:
{
  "Web Frameworks": ["owner/repo1", "owner/repo2"],
  "Data Science Tools": ["owner/repo3", "owner/repo4", "owner/repo5"]
}
`;
  }
  
  private mergeBatchResults(batchResults: Record<string, string[]>[]): Record<string, string[]> {
    const merged: Record<string, string[]> = {};
    
    // Helper to normalize category names
    const normalizeCategory = (category: string): string => {
      return category.trim();
    };
    
    // Process each batch result
    batchResults.forEach(batchResult => {
      Object.entries(batchResult).forEach(([category, repos]) => {
        const normalizedCategory = normalizeCategory(category);
        
        if (!merged[normalizedCategory]) {
          merged[normalizedCategory] = [];
        }
        
        // Add repos without duplicates
        repos.forEach(repo => {
          if (!merged[normalizedCategory].includes(repo)) {
            merged[normalizedCategory].push(repo);
          }
        });
      });
    });
    
    return merged;
  }
  
  async generateDevFact(): Promise<string> {
    try {
      const response = await this.llmClient.chat([
        { role: 'system', content: 'You are a helpful assistant that generates interesting facts about developers.' },
        { role: 'user', content: 'Generate a short, interesting fact about software developers or the tech industry. Keep it concise and fun.' }
      ]);
      
      return response.text;
    } catch (error) {
      logger.error('Error generating developer fact', error);
      return 'Software developers spend approximately 30-40% of their time reading and understanding code.';
    }
  }
}
