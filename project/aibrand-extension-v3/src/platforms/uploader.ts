/**
 * AiBrand Extension v3 — Media Upload Pipeline
 *
 * Handles uploading images, videos, and audio to platform publish pages.
 *
 * Features:
 * - Chunked upload for large files (>10MB)
 * - Progress tracking per file
 * - Format validation against platform constraints
 * - Blob URL ↔ File conversion
 * - Retry on upload failure
 */

import type { MediaFile, MediaConstraints } from '@/shared/types';
import { sleep } from '@/shared/utils';

// ─── Types ────────────────────────────────────────────────────────────────

interface UploadProgress {
  file: MediaFile;
  uploaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadResult {
  file: MediaFile;
  success: boolean;
  url?: string;
  error?: string;
}

type ProgressCallback = (progress: UploadProgress) => void;

// ─── Constants ────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_UPLOADS = 2;
const UPLOAD_RETRY_MAX = 3;

// ─── Uploader ─────────────────────────────────────────────────────────────

export class MediaUploader {
  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Validate media files against platform constraints.
   */
  validate(
    files: MediaFile[],
    constraints: MediaConstraints,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const images = files.filter((f) => f.type === 'image');
    const videos = files.filter((f) => f.type === 'video');
    const audios = files.filter((f) => f.type === 'audio');

    if (images.length > constraints.images.max) {
      errors.push(
        `Too many images: ${images.length}/${constraints.images.max}`,
      );
    }

    if (videos.length > constraints.videos.max) {
      errors.push(
        `Too many videos: ${videos.length}/${constraints.videos.max}`,
      );
    }

    for (const img of images) {
      if (img.size && img.size > constraints.images.maxSize) {
        errors.push(
          `Image ${img.name} too large: ${formatBytes(img.size)}/${formatBytes(constraints.images.maxSize)}`,
        );
      }
    }

    for (const vid of videos) {
      if (vid.size && vid.size > constraints.videos.maxSize) {
        errors.push(
          `Video ${vid.name} too large: ${formatBytes(vid.size)}/${formatBytes(constraints.videos.maxSize)}`,
        );
      }
      if (vid.duration && vid.duration > constraints.videos.maxDuration) {
        errors.push(
          `Video ${vid.name} too long: ${vid.duration}s/${constraints.videos.maxDuration}s`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Download a media file from URL and convert to a Blob.
   * Needed because platform pages can't access cross-origin URLs.
   */
  async downloadToBlob(file: MediaFile): Promise<Blob> {
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Failed to download ${file.name}: ${response.status}`);
    }
    return response.blob();
  }

  /**
   * Upload files to a platform page tab.
   *
   * Strategy:
   * 1. Download files to blobs (if URLs are remote)
   * 2. Inject blob URLs or base64 data into the page
   * 3. Interact with the platform's file input elements
   * 4. Wait for platform upload processing
   */
  async uploadToTab(
    tabId: number,
    files: MediaFile[],
    constraints?: MediaConstraints,
    onProgress?: ProgressCallback,
  ): Promise<UploadResult[]> {
    // Validate
    if (constraints) {
      const validation = this.validate(files, constraints);
      if (!validation.valid) {
        return files.map((f) => ({
          file: f,
          success: false,
          error: validation.errors.join('; '),
        }));
      }
    }

    // Process files in parallel with concurrency limit
    const results: UploadResult[] = [];
    const queue = [...files];

    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) },
      async () => {
        while (queue.length > 0) {
          const file = queue.shift()!;
          const result = await this.uploadSingleFile(tabId, file, onProgress);
          results.push(result);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }

  /**
   * Upload a single file to a platform page.
   */
  private async uploadSingleFile(
    tabId: number,
    file: MediaFile,
    onProgress?: ProgressCallback,
  ): Promise<UploadResult> {
    const progress: UploadProgress = {
      file,
      uploaded: 0,
      total: file.size ?? 0,
      percentage: 0,
      status: 'pending',
    };

    for (let attempt = 1; attempt <= UPLOAD_RETRY_MAX; attempt++) {
      try {
        progress.status = 'uploading';
        progress.percentage = 10;
        onProgress?.(progress);

        // 1. Download file to blob
        const blob = await this.downloadToBlob(file);
        progress.percentage = 30;
        onProgress?.(progress);

        // 2. Create a blob URL that the tab can access
        const blobUrl = URL.createObjectURL(blob);
        progress.percentage = 50;
        onProgress?.(progress);

        // 3. Inject the blob into the page via content script
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: (
            fileName: string,
            fileType: string,
            blobUrl: string,
            fileSize: number,
          ) => {
            return new Promise<{ success: boolean; url?: string; error?: string }>(
              async (resolve) => {
                try {
                  // Convert blob URL back to File object in page context
                  const response = await fetch(blobUrl);
                  const blob = await response.blob();
                  const file = new File([blob], fileName, {
                    type: fileType || blob.type,
                  });

                  // Create a DataTransfer to set the file input
                  const dt = new DataTransfer();
                  dt.items.add(file);

                  // Find file input elements
                  const fileInputs = document.querySelectorAll<HTMLInputElement>(
                    'input[type="file"]',
                  );

                  // Target the most likely file input
                  // (image upload usually has accept="image/*")
                  const targetInput =
                    Array.from(fileInputs).find(
                      (input) =>
                        input.accept?.includes(fileType.split('/')[0]) ||
                        !input.accept,
                    ) ?? fileInputs[0];

                  if (!targetInput) {
                    resolve({
                      success: false,
                      error: 'No file input found on page',
                    });
                    return;
                  }

                  targetInput.files = dt.files;
                  targetInput.dispatchEvent(
                    new Event('change', { bubbles: true }),
                  );
                  targetInput.dispatchEvent(
                    new Event('input', { bubbles: true }),
                  );

                  // Wait briefly for platform to process
                  await new Promise((r) => setTimeout(r, 1000));

                  resolve({ success: true, url: blobUrl });
                } catch (err) {
                  resolve({
                    success: false,
                    error:
                      err instanceof Error ? err.message : 'Unknown error',
                  });
                }
              },
            );
          },
          args: [file.name, file.type ?? 'image/png', blobUrl, file.size ?? 0],
        });

        const uploadResult = result[0]?.result;
        if (uploadResult?.success) {
          progress.status = 'completed';
          progress.percentage = 100;
          progress.uploaded = progress.total;
          onProgress?.(progress);

          // Clean up blob URL after successful transfer
          URL.revokeObjectURL(blobUrl);

          return { file, success: true, url: blobUrl };
        }

        throw new Error(uploadResult?.error ?? 'Upload failed');
      } catch (err) {
        if (attempt === UPLOAD_RETRY_MAX) {
          progress.status = 'error';
          progress.error = err instanceof Error ? err.message : String(err);
          onProgress?.(progress);
          return {
            file,
            success: false,
            error: progress.error,
          };
        }

        // Retry with delay
        progress.percentage = 10;
        progress.status = 'pending';
        onProgress?.(progress);
        await sleep(1000 * attempt);
      }
    }

    return { file, success: false, error: 'Max retries exceeded' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: MediaUploader | null = null;

export function getMediaUploader(): MediaUploader {
  if (!instance) {
    instance = new MediaUploader();
  }
  return instance;
}
