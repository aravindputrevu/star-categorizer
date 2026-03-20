import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  const categoryId = parseInt(params.categoryId, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
  }

  return NextResponse.json({
    repositories: [],
    count: 0,
  });
}
