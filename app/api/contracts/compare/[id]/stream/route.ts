// GET /api/contracts/compare/[id]/stream - SSE stream for comparison status updates

import type { NextRequest } from 'next/server';
import { comparisonStatus } from '../../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if comparison exists
  if (!comparisonStatus.has(id)) {
    return new Response('Comparison not found', { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      const status = comparisonStatus.get(id);
      if (status) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: status.status })}\n\n`)
        );

        // If already completed or failed, close immediately
        if (status.status === 'completed' || status.status === 'failed') {
          controller.close();
          return;
        }
      }

      // Poll for updates every 2 seconds
      intervalId = setInterval(() => {
        const currentStatus = comparisonStatus.get(id);

        if (!currentStatus) {
          controller.close();
          if (intervalId) clearInterval(intervalId);
          return;
        }

        // Send status update
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: currentStatus.status })}\n\n`)
        );

        // Close stream when done
        if (currentStatus.status === 'completed' || currentStatus.status === 'failed') {
          controller.close();
          if (intervalId) clearInterval(intervalId);
        }
      }, 2000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
