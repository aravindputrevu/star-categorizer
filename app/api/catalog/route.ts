/**
 * API routes for managing the developer catalog
 * Supports KV storage with file system fallback
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';

// Interface for developer data
interface DeveloperEntry {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  followers?: number;
  website?: string;
  company?: string;
  location?: string;
  starCategories: Record<string, string[]>;
  topStars: Array<{
    name: string;
    description: string;
    stars: number;
    category: string;
  }>;
  insightSummary: string;
  lastUpdated: string;
}

// Interface for catalog structure
interface Catalog {
  topDevelopers: DeveloperEntry[];
}

// Helper to get KV namespace or fall back to file system
async function getCatalog(env?: any): Promise<Catalog> {
  try {
    // Try to use KV if available
    if (env?.DEVELOPER_CATALOG) {
      const catalog = await env.DEVELOPER_CATALOG.get('catalog', { type: 'json' });
      if (catalog) {
        return catalog as Catalog;
      }
    }
    
    // Fall back to file system
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const filePath = join(process.cwd(), 'public', 'data', 'developer-catalog.json');
    const fileContent = await readFile(filePath, 'utf8');
    return JSON.parse(fileContent) as Catalog;
  } catch (error) {
    logger.warn('Error reading catalog, returning empty catalog', error);
    return { topDevelopers: [] };
  }
}

// Helper to save catalog
async function saveCatalog(catalog: Catalog, env?: any): Promise<void> {
  try {
    // Try to use KV if available
    if (env?.DEVELOPER_CATALOG) {
      await env.DEVELOPER_CATALOG.put('catalog', JSON.stringify(catalog));
      return;
    }
    
    // Fall back to file system
    const { writeFile, mkdir } = await import('fs/promises');
    const { join, dirname } = await import('path');
    const filePath = join(process.cwd(), 'public', 'data', 'developer-catalog.json');
    
    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });
    
    await writeFile(filePath, JSON.stringify(catalog, null, 2));
  } catch (error) {
    logger.error('Error saving catalog', error);
    throw new Error('Failed to save catalog');
  }
}

export async function GET(request: Request) {
  try {
    // Access env object from request context
    const env = (request as any).env;
    
    const catalog = await getCatalog(env);
    return NextResponse.json(catalog);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const developerData = await request.json();
    
    // Validate required fields
    if (!developerData.username) {
      throw new ValidationError('Username is required');
    }
    
    // Access env object from request context
    const env = (request as any).env;
    
    // Get current catalog
    const catalog = await getCatalog(env);
    
    // Check if developer already exists
    const existingIndex = catalog.topDevelopers.findIndex(
      dev => dev.username.toLowerCase() === developerData.username.toLowerCase()
    );
    
    const updatedDeveloper: DeveloperEntry = {
      ...developerData,
      lastUpdated: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      // Update existing developer
      catalog.topDevelopers[existingIndex] = updatedDeveloper;
    } else {
      // Add new developer
      catalog.topDevelopers.push(updatedDeveloper);
    }
    
    // Save the updated catalog
    await saveCatalog(catalog, env);
    
    return NextResponse.json({
      success: true,
      message: existingIndex !== -1 
        ? `Developer ${developerData.username} updated in catalog`
        : `Developer ${developerData.username} added to catalog`
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    // Get username from URL
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    
    if (!username) {
      throw new ValidationError('Username is required');
    }
    
    // Access env object from request context
    const env = (request as any).env;
    
    // Get current catalog
    const catalog = await getCatalog(env);
    
    // Find and remove the developer
    const initialLength = catalog.topDevelopers.length;
    catalog.topDevelopers = catalog.topDevelopers.filter(
      dev => dev.username.toLowerCase() !== username.toLowerCase()
    );
    
    // Check if any developer was removed
    if (catalog.topDevelopers.length === initialLength) {
      throw new NotFoundError(`Developer ${username} not found in catalog`);
    }
    
    // Save the updated catalog
    await saveCatalog(catalog, env);
    
    return NextResponse.json({
      success: true,
      message: `Developer ${username} removed from catalog`
    });
  } catch (error) {
    return handleApiError(error);
  }
}
