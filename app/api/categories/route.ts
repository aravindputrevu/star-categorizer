import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SAVE_UNAVAILABLE_MESSAGE =
  'Saving categories is not available in the Cloudflare deployment because it does not include the local SQLite database.';

export async function GET() {
  return NextResponse.json({ categories: [] });
}

export async function POST(request: NextRequest) {
  const { categoryName, repositories } = await request.json();

  if (!categoryName || !repositories || !Array.isArray(repositories)) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  return NextResponse.json(
    {
      error: SAVE_UNAVAILABLE_MESSAGE,
    },
    { status: 501 }
  );
}
