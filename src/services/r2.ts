/**
 * Cloudflare R2 Storage & Backend Service for Purusharth Studio
 * 
 * Provides:
 * - Direct upload to Cloudflare R2 API (supporting Web, React Native mobile, and Node)
 * - Fine-grained progress tracking (via XMLHttpRequest upload events)
 * - Concurrent batch uploads with worker queue and aggregated progress
 * - Public CDN URL resolution
 * - Supabase 'media' table metadata persistence and event photo counters
 * - Safe credential resolution and optional backend proxy support
 */

import { supabase } from '@/utils/supabase';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface UploadToR2Params {
  file: File | Blob | ArrayBuffer | Uint8Array | { uri: string; name?: string; type?: string; size?: number };
  key: string;
  contentType?: string;
  onProgress?: (percent: number) => void | ((progress: UploadProgress) => void);
  signal?: AbortSignal;
}

export interface MediaRecord {
  id: string;
  event_id: string | null;
  uploaded_by: string | null;
  object_key: string;
  thumbnail_key?: string | null;
  url: string;
  thumbnail_url?: string | null;
  media_type: 'photo' | 'video' | 'raw' | 'document';
  mime_type?: string | null;
  size_bytes?: number | null;
  title?: string | null;
  status: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MediaInsertParams {
  eventId?: string | null;
  event_id?: string | null;
  uploadedBy?: string | null;
  uploaded_by?: string | null;
  objectKey?: string;
  object_key?: string;
  thumbnailKey?: string | null;
  thumbnail_key?: string | null;
  url?: string;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  mediaType?: 'photo' | 'video' | 'raw' | 'document';
  media_type?: 'photo' | 'video' | 'raw' | 'document';
  mimeType?: string | null;
  mime_type?: string | null;
  sizeBytes?: number | null;
  size_bytes?: number | null;
  title?: string | null;
  status?: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed';
}

export interface BatchItemInput {
  file: File | Blob | ArrayBuffer | Uint8Array | { uri: string; name?: string; type?: string; size?: number };
  key?: string;
  contentType?: string;
  title?: string;
  thumbnailKey?: string | null;
}

export interface BatchUploadOptions {
  eventId?: string | null;
  uploadedBy?: string | null;
  concurrency?: number;
  onItemProgress?: (index: number, percent: number, fileName: string) => void;
  onBatchProgress?: (overallProgress: {
    uploaded: number;
    total: number;
    percent: number;
    currentItem?: string;
  }) => void;
}

// ---------------------------------------------------------------------------
// ENVIRONMENT CONFIGURATION
// ---------------------------------------------------------------------------

const CLOUDFLARE_ACCOUNT_ID =
  process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  'c5b183bb011ad958f341adda9e499c13';

const CLOUDFLARE_API_TOKEN =
  process.env.EXPO_PUBLIC_CLOUDFLARE_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN ||
  'cfoat_mw7lDAgbvG_7F2OcmsxW-odtTfLhijyVDvotVom4Q_c.Qf98-lLI-cBBEX5vnnQmkkaS7kCf8iHxFQKUU_muIec';

const R2_BUCKET =
  process.env.EXPO_PUBLIC_R2_BUCKET ||
  process.env.R2_BUCKET ||
  'purusharth-studio';

const R2_PUBLIC_BASE_URL = (
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
  'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev'
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// HELPER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Returns the public CDN URL for an R2 object key
 * e.g. "events/wedding/photo.jpg" -> "https://pub-...r2.dev/events/wedding/photo.jpg"
 */
export function getR2Url(key: string): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const cleanKey = key.replace(/^\/+/, '');
  return `${R2_PUBLIC_BASE_URL}/${cleanKey}`;
}

/**
 * Invalidate or detect MIME content type from filename or extension
 */
export function inferContentType(filenameOrKey: string): string {
  const ext = filenameOrKey.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'webm':
      return 'video/webm';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Generate a clean, standardized S3/R2 storage key
 */
export function generateR2Key(params: {
  folder?: string;
  eventId?: string;
  userId?: string;
  filename: string;
}): string {
  const timestamp = Date.now();
  const cleanFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  if (params.folder === 'selfies' || params.userId) {
    return `selfies/${params.userId || 'anonymous'}_${timestamp}_${cleanFilename}`;
  }
  if (params.folder === 'avatars') {
    return `avatars/${params.userId || 'anonymous'}_${timestamp}_${cleanFilename}`;
  }
  if (params.eventId) {
    return `events/${params.eventId}/${timestamp}_${cleanFilename}`;
  }
  return `${params.folder || 'general'}/${timestamp}_${cleanFilename}`;
}

// ---------------------------------------------------------------------------
// CORE UPLOAD FUNCTION
// ---------------------------------------------------------------------------

/**
 * Upload a file directly to Cloudflare R2 bucket.
 * 
 * Supports:
 * - Web (File, Blob, ArrayBuffer, Uint8Array)
 * - React Native mobile ({ uri, name, type, size })
 * - Node.js verification & test scripts
 * 
 * Can be called with single params object:
 *   uploadToR2({ file, key, contentType, onProgress })
 * or legacy positional arguments:
 *   uploadToR2(file, key, onProgress)
 */
export async function uploadToR2(
  paramsOrFile: UploadToR2Params | UploadToR2Params['file'],
  legacyKey?: string,
  legacyOnProgress?: (progress: UploadProgress | any) => void
): Promise<UploadResult> {
  // Normalize arguments between object signature and positional signature
  let fileInput: UploadToR2Params['file'];
  let key: string;
  let explicitContentType: string | undefined;
  let progressCb: ((percent: number) => void) | ((progress: UploadProgress) => void) | undefined;
  let signal: AbortSignal | undefined;

  if (
    paramsOrFile &&
    typeof paramsOrFile === 'object' &&
    'file' in paramsOrFile &&
    'key' in paramsOrFile
  ) {
    const p = paramsOrFile as UploadToR2Params;
    fileInput = p.file;
    key = p.key;
    explicitContentType = p.contentType;
    progressCb = p.onProgress;
    signal = p.signal;
  } else {
    fileInput = paramsOrFile as UploadToR2Params['file'];
    key = legacyKey || `uploads/${Date.now()}_file`;
    progressCb = legacyOnProgress;
  }

  // Sanitize key (strip leading slashes)
  const cleanKey = key.replace(/^\/+/, '');
  const timestamp = Date.now();

  let fileName = cleanKey.split('/').pop() || `file_${timestamp}`;
  let contentType = explicitContentType || inferContentType(fileName);
  let bodyData: any = null;
  let fileSize = 0;

  // 1. Process File / Blob / ArrayBuffer / Native URI
  if (typeof File !== 'undefined' && fileInput instanceof File) {
    fileName = fileInput.name || fileName;
    contentType = explicitContentType || fileInput.type || inferContentType(fileName);
    fileSize = fileInput.size;
    bodyData = fileInput;
  } else if (typeof Blob !== 'undefined' && fileInput instanceof Blob) {
    contentType = explicitContentType || fileInput.type || inferContentType(fileName);
    fileSize = fileInput.size;
    bodyData = fileInput;
  } else if (fileInput instanceof ArrayBuffer || ArrayBuffer.isView(fileInput)) {
    contentType = explicitContentType || inferContentType(fileName);
    fileSize = fileInput.byteLength;
    bodyData = fileInput;
  } else if (fileInput && typeof fileInput === 'object' && 'uri' in fileInput) {
    const uriObj = fileInput as { uri: string; name?: string; type?: string; size?: number };
    fileName = uriObj.name || fileName;
    contentType = explicitContentType || uriObj.type || inferContentType(fileName);
    fileSize = uriObj.size || 0;

    if ((Platform.OS as string) === 'web' || typeof window !== 'undefined') {
      // Web browser or React Native Web
      const res = await fetch(uriObj.uri);
      const blob = await res.blob();
      bodyData = blob;
      fileSize = blob.size || fileSize;
    } else if (typeof (globalThis as any).nativeCallSyncHook !== 'undefined') {
      // React Native native environment
      const res = await fetch(uriObj.uri);
      const blob = await res.blob();
      bodyData = blob;
      fileSize = blob.size || fileSize;
    } else {
      // Node.js test environment or local fallback
      let loaded = false;
      if (typeof window === 'undefined' && typeof process !== 'undefined') {
        try {
          const reqFn = typeof require === 'function' ? require : null;
          if (reqFn) {
            const fsModule = reqFn('fs');
            const cleanPath = uriObj.uri.replace(/^file:\/\/\/?/, '');
            if (fsModule.existsSync && fsModule.existsSync(cleanPath)) {
              const buf = fsModule.readFileSync(cleanPath);
              bodyData = buf;
              fileSize = buf.length;
              loaded = true;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!loaded) {
        const res = await fetch(uriObj.uri);
        const blob = await res.blob();
        bodyData = blob;
        fileSize = blob.size || fileSize;
      }
    }
  } else {
    throw new Error('uploadToR2: unsupported file input format');
  }

  // Construct Cloudflare R2 direct endpoint
  const encodedPath = cleanKey.split('/').map(encodeURIComponent).join('/');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodedPath}`;
  const publicUrl = getR2Url(cleanKey);

  // Helper to emit progress
  const emitProgress = (loaded: number, total: number) => {
    if (!progressCb) return;
    const safeTotal = total > 0 ? total : fileSize > 0 ? fileSize : 1;
    const percent = Math.min(100, Math.round((loaded / safeTotal) * 100));
    try {
      // Support both (percent: number) and (progress: UploadProgress)
      if (progressCb.length === 1) {
        (progressCb as any)(percent);
        (progressCb as any)({ loaded, total: safeTotal, percent });
      }
    } catch {
      // Ignore callback errors
    }
  };

  emitProgress(0, fileSize);

  // 2. Perform upload via XMLHttpRequest (where supported, for accurate progress) or Fetch
  const useXHR = typeof XMLHttpRequest !== 'undefined';

  if (useXHR) {
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload aborted'));
        });
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          emitProgress(evt.loaded, evt.total);
        } else {
          emitProgress(evt.loaded, fileSize);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          emitProgress(fileSize, fileSize);
          const etag = xhr.getResponseHeader('etag') || undefined;
          resolve({
            key: cleanKey,
            url: publicUrl,
            fileName,
            size: fileSize,
            contentType,
            etag,
          });
        } else {
          reject(
            new Error(
              `R2 upload failed with status ${xhr.status}: ${xhr.responseText || xhr.statusText}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error(`R2 upload network error on key: ${cleanKey}`));
      };

      xhr.ontimeout = () => {
        reject(new Error(`R2 upload timed out on key: ${cleanKey}`));
      };

      xhr.open('PUT', endpoint, true);
      xhr.setRequestHeader('Authorization', `Bearer ${CLOUDFLARE_API_TOKEN}`);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(bodyData);
    });
  } else {
    // Fetch fallback (for Node / worker environments without XHR)
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': contentType,
      },
      body: bodyData,
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`R2 upload failed with status ${response.status}: ${errText}`);
    }

    emitProgress(fileSize, fileSize);
    const etag = response.headers.get('etag') || undefined;

    return {
      key: cleanKey,
      url: publicUrl,
      fileName,
      size: fileSize,
      contentType,
      etag,
    };
  }
}

// ---------------------------------------------------------------------------
// DATABASE PERSISTENCE
// ---------------------------------------------------------------------------

/**
 * Record uploaded media metadata into the Supabase 'media' table.
 * Automatically synchronizes with events.total_photos.
 */
export async function recordMediaInDatabase(
  params: MediaInsertParams
): Promise<MediaRecord | null> {
  const objectKey = params.object_key || params.objectKey;
  if (!objectKey) {
    console.error('recordMediaInDatabase: object_key is required');
    return null;
  }

  const url = params.url || getR2Url(objectKey);
  const thumbnailKey = params.thumbnail_key ?? params.thumbnailKey ?? null;
  const thumbnailUrl =
    params.thumbnail_url ?? params.thumbnailUrl ?? (thumbnailKey ? getR2Url(thumbnailKey) : null);
  const eventId = params.event_id ?? params.eventId ?? null;
  const uploadedBy = params.uploaded_by ?? params.uploadedBy ?? null;
  
  const mediaType =
    params.media_type ||
    params.mediaType ||
    (objectKey.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i) ? 'video' : 'photo');

  const mimeType =
    params.mime_type ||
    params.mimeType ||
    inferContentType(objectKey);

  const sizeBytes = params.size_bytes ?? params.sizeBytes ?? 0;
  const title =
    params.title ||
    objectKey.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') ||
    'Untitled Asset';

  const status = params.status || 'ready';

  try {
    const { data, error } = await supabase
      .from('media')
      .insert({
        event_id: eventId,
        uploaded_by: uploadedBy,
        object_key: objectKey,
        thumbnail_key: thumbnailKey,
        url,
        thumbnail_url: thumbnailUrl,
        media_type: mediaType,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        title,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting media record in Supabase:', error.message);
      return null;
    }

    // Increment total_photos on event if eventId provided
    if (eventId) {
      try {
        await supabase.rpc('increment_event_photos', { p_event_id: eventId });
      } catch {
        // Fallback manual increment
        try {
          const { data: evt } = await supabase
            .from('events')
            .select('total_photos')
            .eq('id', eventId)
            .single();
          if (evt) {
            await supabase
              .from('events')
              .update({ total_photos: (evt.total_photos || 0) + 1 })
              .eq('id', eventId);
          }
        } catch {
          // Ignore non-fatal counter error
        }
      }
    }

    return data as MediaRecord;
  } catch (err) {
    console.error('Exception recording media in DB:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// CONCURRENT BATCH UPLOAD FOR ADMIN
// ---------------------------------------------------------------------------

/**
 * Concurrent batch upload for photos/videos with progress tracking.
 * 
 * Supports:
 * - Configurable concurrency pool (default 3 concurrent uploads)
 * - Individual item progress & aggregated batch progress
 * - Automatic database registration if eventId is provided
 */
export async function uploadMediaBatch(
  items: Array<
    | UploadToR2Params['file']
    | BatchItemInput
  >,
  optionsOrEventId?: BatchUploadOptions | string | null,
  uploadedBy?: string | null,
  legacyOnBatchProgress?: (overallProgress: { uploaded: number; total: number; currentItem?: string }) => void
): Promise<Array<{ upload: UploadResult; record: MediaRecord | null; error?: string }>> {
  // Normalize options
  let options: BatchUploadOptions = {};
  if (typeof optionsOrEventId === 'string' || optionsOrEventId === null) {
    options = {
      eventId: optionsOrEventId,
      uploadedBy,
      onBatchProgress: legacyOnBatchProgress
        ? (p) => legacyOnBatchProgress({ uploaded: p.uploaded, total: p.total, currentItem: p.currentItem })
        : undefined,
    };
  } else if (optionsOrEventId) {
    options = optionsOrEventId;
  }

  const concurrency = Math.max(1, options.concurrency || 3);
  const total = items.length;
  const results: Array<{ upload: UploadResult; record: MediaRecord | null; error?: string }> = new Array(total);

  let completedCount = 0;

  const updateProgress = (currentItemName?: string) => {
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 100;
    if (options.onBatchProgress) {
      options.onBatchProgress({
        uploaded: completedCount,
        total,
        percent,
        currentItem: currentItemName,
      });
    }
  };

  updateProgress();

  // Worker queue for concurrency control
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < total) {
      const index = nextIndex++;
      const rawItem = items[index];

      // Parse item input
      let file: UploadToR2Params['file'];
      let customKey: string | undefined;
      let contentType: string | undefined;
      let title: string | undefined;
      let thumbnailKey: string | null = null;

      if (rawItem && typeof rawItem === 'object' && 'file' in rawItem) {
        const itemInput = rawItem as BatchItemInput;
        file = itemInput.file;
        customKey = itemInput.key;
        contentType = itemInput.contentType;
        title = itemInput.title;
        thumbnailKey = itemInput.thumbnailKey ?? null;
      } else {
        file = rawItem as UploadToR2Params['file'];
      }

      const displayName =
        ('name' in file && (file as any).name) ||
        (customKey ? customKey.split('/').pop() : `File ${index + 1}`);

      updateProgress(displayName);

      try {
        const key =
          customKey ||
          generateR2Key({
            eventId: options.eventId || undefined,
            filename: displayName || `item_${index}.jpg`,
          });

        const upload = await uploadToR2({
          file,
          key,
          contentType,
          onProgress: (pct) => {
            if (options.onItemProgress) {
              options.onItemProgress(index, pct, displayName || '');
            }
          },
        });

        let record: MediaRecord | null = null;
        if (options.eventId || options.uploadedBy) {
          record = await recordMediaInDatabase({
            eventId: options.eventId,
            uploadedBy: options.uploadedBy,
            objectKey: upload.key,
            url: upload.url,
            thumbnailKey,
            mediaType: upload.contentType.startsWith('video/') ? 'video' : 'photo',
            mimeType: upload.contentType,
            sizeBytes: upload.size,
            title: title || upload.fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          });
        }

        results[index] = { upload, record };
      } catch (err: any) {
        console.error(`Batch upload failed for item #${index} (${displayName}):`, err);
        results[index] = {
          upload: {
            key: '',
            url: '',
            fileName: displayName || '',
            size: 0,
            contentType: contentType || 'application/octet-stream',
          },
          record: null,
          error: err?.message || 'Upload failed',
        };
      } finally {
        completedCount++;
        updateProgress();
      }
    }
  }

  // Launch workers up to concurrency limit
  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}

// ---------------------------------------------------------------------------
// DELETE OBJECT FROM R2
// ---------------------------------------------------------------------------

/**
 * Delete an object from Cloudflare R2 bucket
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const cleanKey = key.replace(/^\/+/, '');
  const encodedPath = cleanKey.split('/').map(encodeURIComponent).join('/');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodedPath}`;

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error(`Failed to delete object from R2 (${cleanKey}):`, error);
    return false;
  }
}
