import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/services/DatabaseService';
import { logger } from '@/lib/utils';

// Using Node.js runtime for SQLite compatibility
export const runtime = 'nodejs';

/**
 * GET handler to retrieve all saved lists
 */
export async function GET() {
  try {
    const categories = dbService.getAllCategories();
    return NextResponse.json({ lists: categories });
  } catch (error) {
    logger.error('Error fetching saved lists', error);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}