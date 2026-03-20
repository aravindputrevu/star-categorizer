import { NextResponse } from 'next/server';
import catalogData from '@/public/data/developer-catalog.json';

export const runtime = 'edge';

const MUTATION_UNAVAILABLE_MESSAGE =
  'Catalog mutations are not available in the Cloudflare deployment. Update the static catalog file in the repository instead.';

export async function GET() {
  return NextResponse.json(catalogData);
}

export async function POST() {
  return NextResponse.json(
    {
      error: MUTATION_UNAVAILABLE_MESSAGE,
    },
    { status: 501 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: MUTATION_UNAVAILABLE_MESSAGE,
    },
    { status: 501 }
  );
}
