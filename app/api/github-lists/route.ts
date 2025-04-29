import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { logger } from '@/lib/utils';

// Keep this as edge runtime to avoid SQLite issues
export const runtime = 'edge';

// Create GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

/**
 * POST handler for GitHub list operations
 * Supports:
 * 1. Creating a new list (with username, listName, description)
 * 2. Adding repos to an existing list (with username, listName, repositories array)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, listName, description, repositories } = body;

    if (!username || !listName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this is a create list request or an add repositories request
    if (description && !repositories) {
      // Create a new list
      try {
        await octokit.rest.stars.createListForAuthenticatedUser({
          name: listName,
          description: description || `Categorized stars: ${listName}`
        });

        logger.info(`Created GitHub list for user`, { listName, username });
        
        return NextResponse.json({
          success: true,
          message: `Successfully created GitHub list: ${listName}`
        });
      } catch (error: any) {
        // Check if it's a "list already exists" error (422 with specific message)
        if (error.status === 422 && 
            error.response?.data?.errors?.some((e: any) => 
              e.message?.includes('already exists'))) {
          
          logger.info(`List already exists, skipping creation`, { listName });
          
          return NextResponse.json({
            success: true,
            message: `GitHub list already exists: ${listName}`
          });
        }
        
        throw error;
      }
    } 
    
    // Add repositories to a list
    else if (repositories && Array.isArray(repositories)) {
      // First, get all the user's lists
      const lists = await octokit.rest.stars.listStarredLists({
        username
      });
      
      // Find the target list
      const targetList = lists.data.find(list => list.name === listName);
      
      if (!targetList) {
        return NextResponse.json({ 
          error: `List "${listName}" not found for user ${username}` 
        }, { status: 404 });
      }
      
      // Add repositories to the list
      let addedCount = 0;
      
      for (const repo of repositories) {
        try {
          const [owner, repoName] = repo.split('/');
          
          await octokit.rest.stars.addStarRepoToList({
            list_name: listName,
            owner,
            repo: repoName
          });
          
          addedCount++;
        } catch (error: any) {
          // Skip if repo already in list (422 error)
          if (error.status === 422) {
            logger.debug(`Repository already in list, skipping`, { repo, listName });
            continue;
          }
          
          logger.error(`Error adding repository to list`, error, { 
            repo, listName, errorStatus: error.status 
          });
        }
      }
      
      logger.info(`Added repositories to GitHub list`, { 
        listName, addedCount, totalAttempted: repositories.length 
      });
      
      return NextResponse.json({
        success: true,
        addedCount,
        message: `Added ${addedCount} repositories to GitHub list: ${listName}`
      });
    } 
    
    // Invalid request
    else {
      return NextResponse.json({ 
        error: 'Invalid request. Must either create a list or add repositories to a list' 
      }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Error processing GitHub list request', error);
    
    return NextResponse.json({ 
      error: 'Failed to process GitHub list operation',
      message: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}