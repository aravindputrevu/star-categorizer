import { NextResponse } from 'next/server';
import { dbService } from '@/lib/services/DatabaseService';
import { logger } from '@/lib/utils';

// Use Node.js runtime for SQLite
export const runtime = 'nodejs';

// Get repositories by category ID
export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const categoryId = parseInt(params.categoryId);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }
    
    const repositories = dbService.getRepositoriesByCategory(categoryId);
    
    return NextResponse.json({ 
      repositories,
      count: repositories.length
    });
  } catch (error) {
    logger.error('Error fetching repositories by category', error, { categoryId: params.categoryId });
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}