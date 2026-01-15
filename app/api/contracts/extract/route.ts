// POST /api/contracts/extract - Extract text from uploaded document
// Uses Case.dev OCR API with document_url for PDF and DOCX, direct read for TXT

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { storeFile, deleteFile } from '@/lib/file-store';
import {
  checkUsageLimitsServer,
  parseUsageFromRequest,
} from '@/lib/usage/server';

const CASEDEV_API_URL = process.env.CASEDEV_API_URL || 'https://api.case.dev';
const CASEDEV_API_KEY = process.env.CASEDEV_API_KEY;

export async function POST(request: NextRequest) {
  // Check demo usage limits before processing
  const usage = parseUsageFromRequest(request);
  const usageCheck = checkUsageLimitsServer(usage);

  if (!usageCheck.isAllowed) {
    return NextResponse.json({
      error: 'Demo limit exceeded',
      reason: usageCheck.reason,
      message: usageCheck.reason === 'time_exceeded'
        ? 'Your demo session has expired.'
        : 'You have reached the API usage limit for this demo.',
      redirectUrl: 'https://console.case.dev',
    }, { status: 429 });
  }

  let fileId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    // For plain text files, read directly
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const text = await file.text();
      return NextResponse.json({
        text,
        fileName: file.name,
        fileType: 'txt',
        method: 'direct',
      });
    }

    // For PDF and DOCX, use Case.dev OCR API
    if (!CASEDEV_API_KEY) {
      return NextResponse.json(
        { error: 'OCR service not configured. CASEDEV_API_KEY is required for PDF/DOCX files.' },
        { status: 500 }
      );
    }

    // Check for Vercel Blob configuration
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'PDF/DOCX extraction requires Vercel Blob. Use TXT files for local development.' },
        { status: 400 }
      );
    }

    // Validate file type
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX =
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx');

    if (!isPDF && !isDOCX) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' },
        { status: 400 }
      );
    }

    // Generate unique ID and store file
    fileId = crypto.randomUUID();
    const buffer = await file.arrayBuffer();

    // Detect/fix MIME type if needed
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
    }

    // Upload to Vercel Blob and get public URL
    const fileUrl = await storeFile(fileId, buffer, mimeType, file.name);

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Failed to upload file. Ensure BLOB_READ_WRITE_TOKEN is configured.' },
        { status: 500 }
      );
    }

    // Submit to Case.dev OCR with document_url
    const submitResponse = await fetch(`${CASEDEV_API_URL}/ocr/v1/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CASEDEV_API_KEY}`,
      },
      body: JSON.stringify({
        document_url: fileUrl,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      await deleteFile(fileId);
      return NextResponse.json(
        { error: `OCR submission failed: ${errorText}` },
        { status: 500 }
      );
    }

    const submitResult = await submitResponse.json();
    const jobId = submitResult.job_id || submitResult.id || submitResult.jobId;

    if (!jobId) {
      await deleteFile(fileId);
      return NextResponse.json(
        { error: 'OCR service did not return a job ID' },
        { status: 500 }
      );
    }

    // Construct status URL
    const statusUrl = `${CASEDEV_API_URL}/ocr/v1/${jobId}`;

    // Poll for completion (max 90 seconds for larger documents)
    const maxAttempts = 45;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${CASEDEV_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        continue;
      }

      const status = await statusResponse.json();

      if (status.status === 'completed') {
        await deleteFile(fileId);

        // Get the text from the status response or fetch from download endpoint
        let text = status.text || status.extracted_text || status.content || status.result?.text;

        if (!text) {
          // Use /download/json endpoint - this is the correct pattern per Case.dev API
          const jsonUrl = `${CASEDEV_API_URL}/ocr/v1/${jobId}/download/json`;
          const jsonResponse = await fetch(jsonUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${CASEDEV_API_KEY}`,
            },
          });

          if (jsonResponse.ok) {
            const contentType = jsonResponse.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
              const jsonResult = await jsonResponse.json();

              // Try common field patterns
              text = jsonResult.text || jsonResult.extracted_text || jsonResult.content;

              // If text is in pages array, concatenate all page texts
              if (!text && jsonResult.pages && Array.isArray(jsonResult.pages)) {
                text = jsonResult.pages
                  .map((page: { text?: string; content?: string }) => page.text || page.content || '')
                  .join('\n\n');
              }
            } else {
              // Plain text response
              text = await jsonResponse.text();
            }
          }
        }

        if (!text) {
          return NextResponse.json(
            { error: 'OCR completed but no text was returned' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          text,
          fileName: file.name,
          fileType: isPDF ? 'pdf' : 'docx',
          method: 'ocr',
        });
      }

      if (status.status === 'failed') {
        await deleteFile(fileId);
        const errorMsg = status.error || status.message || 'Unknown error';
        return NextResponse.json(
          { error: `OCR processing failed: ${errorMsg}` },
          { status: 500 }
        );
      }
    }

    // Timeout - clean up
    await deleteFile(fileId);
    return NextResponse.json(
      { error: 'OCR processing timed out. Please try again with a smaller file.' },
      { status: 504 }
    );
  } catch (error) {
    if (fileId) {
      await deleteFile(fileId);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
