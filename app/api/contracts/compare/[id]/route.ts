// GET /api/contracts/compare/[id] - Get comparison status and result

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { comparisonStatus } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get status from in-memory store
  const status = comparisonStatus.get(id);

  if (!status) {
    return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
  }

  // Return status and result if completed
  if (status.status === 'completed' && status.result) {
    return NextResponse.json({
      id,
      status: status.status,
      comparison: status.result,
    });
  }

  if (status.status === 'failed') {
    return NextResponse.json({
      id,
      status: status.status,
      error: status.error,
    });
  }

  // Still processing
  return NextResponse.json({
    id,
    status: status.status,
  });
}
