import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/services/DatabaseService';
import { logger } from '@/lib/utils';

// Using Node.js runtime for SQLite compatibility
export const runtime = 'nodejs';

type Params = {
  params: {
    listId: string;
  };
};

/**
 * GET handler to retrieve stars for a specific list
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const listId = parseInt(params.listId);
    
    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }
    
    const repositories = dbService.getRepositoriesByCategory(listId);
    
    return NextResponse.json({
      listId,
      repositories,
      count: repositories.length
    });
  } catch (error) {
    logger.error('Error fetching repositories for list', error, { listId: params.listId });
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}