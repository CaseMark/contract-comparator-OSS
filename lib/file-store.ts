/**
 * File store for temporary file uploads
 *
 * Uses Vercel Blob in production for persistent storage accessible by external APIs.
 * Falls back to in-memory storage for local development (TXT files only).
 */

import { put, del } from '@vercel/blob';

interface StoredFile {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

interface BlobReference {
  url: string;
  pathname: string;
}

// In-memory store for local development fallback
const localFileStore = new Map<string, StoredFile>();

// Track blob URLs for cleanup
const blobStore = new Map<string, BlobReference>();

// TTL for stored files (5 minutes - enough for OCR processing)
const FILE_TTL_MS = 5 * 60 * 1000;

/**
 * Check if Vercel Blob is configured
 */
function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Store a file and return its public URL
 *
 * In production: uploads to Vercel Blob
 * In development: stores in memory (for TXT files only)
 */
export async function storeFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<string | null> {
  if (isBlobConfigured()) {
    // Production: use Vercel Blob
    const blob = await put(`temp/${id}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    blobStore.set(id, {
      url: blob.url,
      pathname: `temp/${id}/${filename}`,
    });

    // Schedule cleanup
    setTimeout(() => {
      deleteFile(id);
    }, FILE_TTL_MS);

    return blob.url;
  }

  // Local development: in-memory storage (won't work for OCR)
  localFileStore.set(id, {
    buffer,
    mimeType,
    filename,
    createdAt: Date.now(),
  });

  setTimeout(() => {
    localFileStore.delete(id);
  }, FILE_TTL_MS);

  return null;
}

/**
 * Retrieve a stored file (local development only)
 */
export function getFile(id: string): StoredFile | null {
  const file = localFileStore.get(id);

  if (!file) {
    return null;
  }

  if (Date.now() - file.createdAt > FILE_TTL_MS) {
    localFileStore.delete(id);
    return null;
  }

  return file;
}

/**
 * Delete a stored file
 */
export async function deleteFile(id: string): Promise<void> {
  // Delete from Vercel Blob if exists
  const blobRef = blobStore.get(id);
  if (blobRef) {
    try {
      await del(blobRef.url);
    } catch {
      // Ignore deletion errors (file may already be gone)
    }
    blobStore.delete(id);
  }

  // Also clean up local store
  localFileStore.delete(id);
}

/**
 * Get the public URL for a stored file
 *
 * Returns the Vercel Blob URL if available.
 */
export function getFileUrl(id: string): string | null {
  const blobRef = blobStore.get(id);
  return blobRef?.url ?? null;
}
