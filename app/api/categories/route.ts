import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/services/DatabaseService';
import { logger } from '@/lib/utils';

// Using Node.js runtime for SQLite compatibility
export const runtime = 'nodejs';

/**
 * GET handler to retrieve all categories
 */
export async function GET() {
  try {
    const categories = dbService.getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

/**
 * POST handler to create a new category with repositories
 */
export async function POST(request: NextRequest) {
  try {
    const { categoryName, repositories } = await request.json();

    if (!categoryName || !repositories || !Array.isArray(repositories)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const result = dbService.createCategoryWithRepositories(categoryName, repositories);
    
    return NextResponse.json({
      success: true,
      categoryId: result.categoryId,
      addedCount: result.addedCount,
      message: `Successfully created category "${categoryName}" with ${result.addedCount} repositories`
    });
  } catch (error) {
    logger.error('Error creating category', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}