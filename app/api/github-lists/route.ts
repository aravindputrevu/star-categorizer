/**
 * @fileoverview API route handler for GitHub lists integration
 * Handles creating GitHub lists and adding repositories to them
 * Uses GithubService for modular API interactions
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils';
import { GithubService } from '@/lib/services/GithubService';

export const runtime = 'edge';
export const maxDuration = 60; // 1 minute timeout

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
    
    const githubService = GithubService.getInstance();
    
    if (repositories && Array.isArray(repositories)) {
      const result = await githubService.addRepositoriesToList(username, listName, repositories);
      return NextResponse.json(result);
    } else {
      const result = await githubService.createList(username, listName, description);
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
