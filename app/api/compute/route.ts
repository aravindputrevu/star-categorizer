/**
 * API route handler for computing repository categorizations
 * Refactored to use modular services
 */

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { logger } from '@/lib/utils';
import { handleApiError, ValidationError, AppError } from '@/lib/errors';
import { GithubService, StarredRepo } from '@/lib/services/GithubService';
import { CategoryService } from '@/lib/services/CategoryService';
import { CacheService } from '@/lib/services/CacheService';
import { getDefaultLLMProvider } from '@/lib/llm';

// Define runtime for edge compatibility
export const runtime = 'edge';
export const maxDuration = 300;

// Track pending requests to avoid duplicates
const pendingRequests = new Map<string, Promise<Response>>();

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    
    // Basic validation
    if (!username || typeof username !== 'string') {
      throw new ValidationError('Valid username is required');
    }
    
    // Check for pending request for this username
    if (pendingRequests.has(username)) {
      logger.info(`Reusing pending request for ${username}`);
      return pendingRequests.get(username) as Promise<Response>;
    }
    
    // Create a new request promise
    const requestPromise = processUsername(username, request);
    pendingRequests.set(username, requestPromise);
    
    // Clean up after request is complete
    requestPromise.finally(() => {
      pendingRequests.delete(username);
    });
    
    return requestPromise;
  } catch (error) {
    return handleApiError(error);
  }
}

async function processUsername(username: string, request: Request): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Initialize GitHub client
    const githubToken = process.env.GITHUB_ACCESS_TOKEN || '';
    if (!githubToken) {
      throw new AppError('GitHub token is not configured', 500);
    }
    
    const octokit = new Octokit({
      auth: githubToken
    });
    
    // Access env object from request context for KV bindings
    const env = (request as any).env;
    
    // Initialize services
    const starsCache = new CacheService<StarredRepo[]>(
      env?.STAR_CACHE || null,
      'stars:'
    );
    
    const categoriesCache = new CacheService<Record<string, string[]>>(
      env?.STAR_CACHE || null,
      'categories:'
    );
    
    const githubService = new GithubService(octokit, starsCache);
    
    // Get LLM client
    const llmClient = await getDefaultLLMProvider();
    const categoryService = new CategoryService(llmClient, categoriesCache);
    
    // Fetch starred repos
    const starredRepos = await githubService.getStarredRepos(username);
    
    // Handle case with no stars
    if (starredRepos.length === 0) {
      const devFact = await categoryService.generateDevFact();
      
      return NextResponse.json({
        message: `No starred repositories found for ${username}`,
        starredCount: 0,
        noStars: true,
        devFact,
        processingTime: Date.now() - startTime
      });
    }
    
    // Categorize the repos
    const categories = await categoryService.categorizeRepos(starredRepos, username);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      message: `Successfully categorized starred projects for ${username}`,
      starredCount: starredRepos.length,
      categoryCount: Object.keys(categories).length,
      categories,
      processingTime
    });
  } catch (error: any) {
    logger.error(`Error processing username ${username}`, error);
    
    let statusCode = 500;
    let message = `Error processing ${username}`;
    
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
    } else if (error.status) {
      statusCode = error.status;
      
      if (error.status === 404) {
        message = `GitHub user ${username} not found`;
      } else {
        message = `GitHub API error: ${error.message}`;
      }
    }
    
    // Include helpful retry suggestion for rate limit issues
    const retryMessage = statusCode === 403 
      ? 'GitHub API rate limit reached. Please try again later.'
      : '';
    
    return NextResponse.json({
      error: message,
      retryMessage,
      processingTime: Date.now() - startTime
    }, { status: statusCode });
  }
}
