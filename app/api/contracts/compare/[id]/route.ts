// GET /api/contracts/compare/[id] - Get comparison status and result

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { comparisonStatus } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Client-side auth - no server session validation
  // In production with server auth, validate session here

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
      clauseMatches: status.clauseMatches || [],
      sourceContract: status.sourceContract,
      targetContract: status.targetContract,
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
