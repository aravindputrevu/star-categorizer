/**
 * @fileoverview API route handler for GitHub lists integration
 * Handles creating GitHub lists and adding repositories to them
 */

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { logger } from '@/lib/utils';

export const runtime = 'edge';
export const maxDuration = 60; // 1 minute timeout

/**
 * Octokit instance configured with performance optimizations
 */
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
  request: {
    timeout: 10000, // 10 second timeout for API requests
    retries: 2 // Auto-retry failed requests
  }
});

/**
 * Interface for GitHub list creation request
 */
interface CreateListRequest {
  username: string;
  listName: string;
  description?: string;
}

/**
 * Interface for adding repositories to a list request
 */
interface AddToListRequest {
  username: string;
  listName: string;
  repositories: string[];
}

/**
 * Creates a new GitHub list (starred repository collection)
 * @param username GitHub username
 * @param listName Name of the list to create
 * @param description Optional description for the list
 * @returns Response with list details or error
 */
async function createGitHubList(username: string, listName: string, description?: string) {
  try {
    logger.info(`Creating GitHub list "${listName}" for user ${username}`);
    
    const response = await octokit.request('POST /user/starred-lists', {
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
    throw error;
  }
}

/**
 * Adds repositories to a GitHub list
 * @param username GitHub username
 * @param listName Name of the list
 * @param repositories Array of repository full names (owner/repo)
 * @returns Response with success status or error
 */
async function addRepositoriesToList(username: string, listName: string, repositories: string[]) {
  try {
    logger.info(`Adding ${repositories.length} repositories to list "${listName}" for user ${username}`);
    
    const listsResponse = await octokit.request('GET /user/starred-lists');
    const list = listsResponse.data.find((l: any) => l.name === listName);
    
    if (!list) {
      throw new Error(`List "${listName}" not found`);
    }
    
    const BATCH_SIZE = 10;
    const batches = [];
    
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
          await octokit.request('PUT /user/starred-lists/{list_id}/repos/{owner}/{repo}', {
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
    throw error;
  }
}

/**
 * POST handler for creating GitHub lists
 * @param request HTTP request object
 * @returns JSON response with list details or error
 */
export async function POST(request: Request) {
  try {
    const { username, listName, description, repositories } = await request.json();
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    
    if (!listName || typeof listName !== 'string') {
      return NextResponse.json({ error: 'Invalid list name' }, { status: 400 });
    }
    
    if (repositories && Array.isArray(repositories)) {
      const result = await addRepositoriesToList(username, listName, repositories);
      return NextResponse.json(result);
    } else {
      const result = await createGitHubList(username, listName, description);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    logger.error('Error processing GitHub list request', error);
    
    if (error.status === 401) {
      return NextResponse.json({ 
        error: 'GitHub authentication failed. Check your access token.' 
      }, { status: 401 });
    } else if (error.status === 403) {
      return NextResponse.json({ 
        error: 'GitHub permission denied. Make sure your token has the correct scopes.' 
      }, { status: 403 });
    } else if (error.status === 404) {
      return NextResponse.json({ 
        error: 'GitHub resource not found. The list or repository may not exist.' 
      }, { status: 404 });
    } else if (error.status === 422) {
      return NextResponse.json({ 
        error: 'Invalid request to GitHub API. The list may already exist or have validation issues.' 
      }, { status: 422 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'An error occurred while processing the request' 
    }, { status: 500 });
  }
}
