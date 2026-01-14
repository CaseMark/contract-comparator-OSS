import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/file-store';

/**
 * Serves stored files by ID (local development fallback only)
 *
 * In production, files are served directly from Vercel Blob URLs.
 * This endpoint only handles local development in-memory files.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const file = getFile(id);

  if (!file) {
    return new NextResponse('File not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse(file.buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.buffer.byteLength),
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
