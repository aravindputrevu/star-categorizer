/**
 * Service for interacting with the GitHub API
 */

import { Octokit } from '@octokit/rest';
import { CacheService } from './CacheService';
import { logger } from '../utils';
import { AppError } from '../errors';

export interface StarredRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  topics: string[];
  stargazers_count: number;
  html_url: string;
  created_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export class GithubService {
  private octokit: Octokit;
  private cacheService: CacheService<StarredRepo[]>;
  private concurrencyLimit: number;
  
  constructor(
    octokit: Octokit, 
    cacheService: CacheService<StarredRepo[]>,
    concurrencyLimit: number = 3
  ) {
    this.octokit = octokit;
    this.cacheService = cacheService;
    this.concurrencyLimit = concurrencyLimit;
  }
  
  async getStarredRepos(username: string): Promise<StarredRepo[]> {
    // Try to get from cache first
    const cacheKey = `stars:${username}`;
    const cachedRepos = await this.cacheService.get(cacheKey);
    
    if (cachedRepos) {
      logger.info(`Using cached starred repos for ${username}`, { count: cachedRepos.length });
      return cachedRepos;
    }
    
    // Fetch all pages of starred repos
    logger.info(`Fetching starred repos for ${username}`);
    
    try {
      const allRepos: StarredRepo[] = [];
      let page = 1;
      let hasNextPage = true;
      const perPage = 100;
      
      // Process multiple pages concurrently with limited concurrency
      while (hasNextPage) {
        const pagePromises: Promise<void>[] = [];
        
        // Create promises for concurrent page fetching
        for (let i = 0; i < this.concurrencyLimit && hasNextPage; i++) {
          const currentPage = page++;
          
          const pagePromise = this.fetchStarredReposPage(username, currentPage, perPage)
            .then(response => {
              const repos = response.data;
              allRepos.push(...repos);
              
              // Check if we have more pages
              if (repos.length < perPage) {
                hasNextPage = false;
              }
            })
            .catch(err => {
              logger.error(`Error fetching page ${currentPage} for ${username}`, err);
              hasNextPage = false; // Stop on error
              throw err;
            });
            
          pagePromises.push(pagePromise);
        }
        
        // Wait for the current batch of pages
        await Promise.all(pagePromises);
      }
      
      // Cache the results
      logger.info(`Caching ${allRepos.length} starred repos for ${username}`);
      await this.cacheService.set(cacheKey, allRepos, 60); // Cache for 60 minutes
      
      return allRepos;
    } catch (error: any) {
      if (error.status === 404) {
        throw new AppError(`GitHub user ${username} not found`, 404, { username });
      }
      
      logger.error(`Error fetching starred repos for ${username}`, error);
      throw new AppError(
        `Failed to fetch starred repos for ${username}. GitHub API error: ${error.message}`, 
        error.status || 500,
        { username }
      );
    }
  }
  
  private async fetchStarredReposPage(username: string, page: number, perPage: number) {
    return this.octokit.activity.listReposStarredByUser({
      username,
      per_page: perPage,
      page,
      sort: 'created',
      direction: 'desc'
    });
  }
  
  async getUserProfile(username: string) {
    try {
      const response = await this.octokit.users.getByUsername({
        username
      });
      
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        throw new AppError(`GitHub user ${username} not found`, 404, { username });
      }
      
      logger.error(`Error fetching profile for ${username}`, error);
      throw new AppError(
        `Failed to fetch profile for ${username}. GitHub API error: ${error.message}`, 
        error.status || 500,
        { username }
      );
    }
  }
}
