/**
 * GitHub API service for interacting with GitHub lists and repositories
 * Provides methods for creating lists and adding repositories to them
 */

import { Octokit } from '@octokit/rest';
import { logger } from '../utils';

/**
 * Interface for GitHub list creation request
 */
export interface CreateListRequest {
  username: string;
  listName: string;
  description?: string;
}

/**
 * Interface for adding repositories to a list request
 */
export interface AddToListRequest {
  username: string;
  listName: string;
  repositories: string[];
}

/**
 * GitHub service for interacting with GitHub API
 * Handles authentication, rate limiting, and error handling
 */
export class GithubService {
  private octokit: Octokit;
  private static instance: GithubService;

  /**
   * Private constructor to enforce singleton pattern
   * @param token GitHub access token
   */
  private constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_ACCESS_TOKEN,
      request: {
        timeout: 10000, // 10 second timeout for API requests
        retries: 2 // Auto-retry failed requests
      }
    });
  }

  /**
   * Get singleton instance of GithubService
   * @param token Optional GitHub access token
   * @returns GithubService instance
   */
  public static getInstance(token?: string): GithubService {
    if (!GithubService.instance) {
      GithubService.instance = new GithubService(token);
    }
    return GithubService.instance;
  }

  /**
   * Creates a new GitHub list (starred repository collection)
   * @param username GitHub username
   * @param listName Name of the list to create
   * @param description Optional description for the list
   * @returns Response with list details or error
   */
  public async createList(username: string, listName: string, description?: string) {
    try {
      logger.info(`Creating GitHub list "${listName}" for user ${username}`);
      
      const response = await this.octokit.request('POST /user/starred-lists', {
        name: listName,
        description: description || `Categorized stars: ${listName}`
      });
      
      logger.info(`Successfully created GitHub list "${listName}"`, {
        listId: response.data.id
      });
      
      return {
        success: true,
        listId: response.data.id,
        name: response.data.name
      };
    } catch (error) {
      logger.error('Error creating GitHub list', error, { username, listName });
      throw this.handleGitHubError(error);
    }
  }

  /**
   * Adds repositories to a GitHub list with batch processing
   * @param username GitHub username
   * @param listName Name of the list
   * @param repositories Array of repository full names (owner/repo)
   * @returns Response with success status or error
   */
  public async addRepositoriesToList(username: string, listName: string, repositories: string[]) {
    try {
      logger.info(`Adding ${repositories.length} repositories to list "${listName}" for user ${username}`);
      
      const listsResponse = await this.octokit.request('GET /user/starred-lists');
      const list = listsResponse.data.find((l: any) => l.name === listName);
      
      if (!list) {
        throw new Error(`List "${listName}" not found`);
      }
      
      const BATCH_SIZE = 10;
      const batches: string[][] = [];
      
      for (let i = 0; i < repositories.length; i += BATCH_SIZE) {
        batches.push(repositories.slice(i, i + BATCH_SIZE));
      }
      
      logger.info(`Processing repositories in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} repositories`);
        
        for (const repo of batch) {
          const [owner, repoName] = repo.split('/');
          
          try {
            await this.octokit.request('PUT /user/starred-lists/{list_id}/repos/{owner}/{repo}', {
              list_id: list.id,
              owner,
              repo: repoName
            });
            
            logger.debug(`Added ${repo} to list "${listName}"`);
          } catch (repoError) {
            logger.warn(`Failed to add ${repo} to list "${listName}"`, repoError as Record<string, any>);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logger.info(`Successfully added repositories to list "${listName}"`);
      
      return {
        success: true,
        listId: list.id,
        name: list.name,
        addedCount: repositories.length
      };
    } catch (error) {
      logger.error('Error adding repositories to list', error, { username, listName });
      throw this.handleGitHubError(error);
    }
  }

  /**
   * Handles GitHub API errors and returns appropriate error objects
   * @param error Error from GitHub API
   * @returns Standardized error object
   */
  private handleGitHubError(error: any): Error {
    if (error.status === 401) {
      return new Error('GitHub authentication failed. Check your access token.');
    } else if (error.status === 403) {
      return new Error('GitHub permission denied. Make sure your token has the correct scopes.');
    } else if (error.status === 404) {
      return new Error('GitHub resource not found. The list or repository may not exist.');
    } else if (error.status === 422) {
      return new Error('Invalid request to GitHub API. The list may already exist or have validation issues.');
    }
    
    return error;
  }
}

export default GithubService;
