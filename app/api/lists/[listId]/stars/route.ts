import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type Params = {
  params: {
    listId: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  const listId = parseInt(params.listId, 10);

  if (isNaN(listId)) {
    return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
  }

  return NextResponse.json({
    listId,
    repositories: [],
    count: 0,
  });
}
