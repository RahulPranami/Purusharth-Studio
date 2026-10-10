/**
 * Face Recognition & Biometric Analyzer Client for Purusharth Studio
 * 
 * Communicates with the standalone Purusharth-Studio-Analyzer FastAPI service
 * (hosted at https://purusharth-studio-analyzer.onrender.com)
 * 
 * Features:
 * - Real-time selfie validation (face detection, clarity, single-face constraint)
 * - Cosine vector search matching against Cloudflare R2 photos
 * - Instant photo indexing after Cloudflare R2 uploads
 * - Full cross-platform support (React Native iOS/Android & Web)
 */

import { Platform } from 'react-native';

const ANALYZER_BASE_URL = (
  process.env.EXPO_PUBLIC_ANALYZER_API_URL ||
  'https://purusharth-studio-analyzer.onrender.com'
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  face_index: number;
  bounding_box: BoundingBox | null;
  confidence: number;
}

export interface SelfieAnalyzeResponse {
  faces_detected_count: number;
  is_valid_selfie: boolean;
  faces: DetectedFace[];
  message: string;
}

export interface MatchedFace {
  image_key: string;
  face_index: number;
  similarity: number;
  distance: number;
  bounding_box: BoundingBox | null;
}

export interface PhotoMatch {
  image_key: string;
  best_similarity: number;
  min_distance: number;
  match_count: number;
  matched_faces: MatchedFace[];
}

export interface SelfieMatchResponse {
  total_faces_in_query: number;
  matched_photos_count: number;
  threshold_applied: number;
  top_matches: PhotoMatch[];
}

export interface IndexObjectResponse {
  object_key: string;
  status: 'indexed' | 'skipped' | 'no_faces';
  faces_detected: number;
  message: string;
}

export interface AnalyzerHealthResponse {
  status: string;
  r2_configured: boolean;
  r2_connection: string;
  database_status: string;
  model_adapter: string;
  indexed_images_count: number;
  total_faces_count: number;
  environment: string;
}

export type NativeImageInput = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
};

// ---------------------------------------------------------------------------
// HELPER: FORMAT API ERRORS SAFELY (NEVER RETURN [object Object])
// ---------------------------------------------------------------------------

export function formatApiError(data: any, fallbackStatus?: number): string {
  if (!data) return fallbackStatus ? `Request failed (HTTP ${fallbackStatus})` : 'Unknown error';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return (
      data.detail
        .map((item: any) => {
          if (typeof item === 'string') return item;
          return item.msg || item.message || JSON.stringify(item);
        })
        .filter(Boolean)
        .join(', ') || 'Validation error'
    );
  }
  if (typeof data.detail === 'object' && data.detail !== null) {
    return data.detail.msg || data.detail.message || data.detail.error || JSON.stringify(data.detail);
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return fallbackStatus ? `Request failed (HTTP ${fallbackStatus})` : 'Server error';
}

// ---------------------------------------------------------------------------
// HELPER: PREPARE MULTIPART FORM DATA FOR WEB & REACT NATIVE
// ---------------------------------------------------------------------------

async function createFormDataWithFile(
  fileInput: NativeImageInput | Blob | File,
  fieldName = 'file'
): Promise<FormData> {
  const formData = new FormData();

  if (typeof Blob !== 'undefined' && fileInput instanceof Blob) {
    formData.append(fieldName, fileInput);
    return formData;
  }

  if (typeof File !== 'undefined' && fileInput instanceof File) {
    formData.append(fieldName, fileInput);
    return formData;
  }

  // Native React Native / Web URI object
  const uriObj = fileInput as NativeImageInput;
  const fileName = uriObj.name || `photo_${Date.now()}.jpg`;
  const mimeType = uriObj.type || 'image/jpeg';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // On web, fetch local blob from uri
    const res = await fetch(uriObj.uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, fileName);
  } else {
    // In React Native native (iOS / Android)
    formData.append(fieldName, {
      uri: uriObj.uri,
      name: fileName,
      type: mimeType,
    } as any);
  }

  return formData;
}

// ---------------------------------------------------------------------------
// API METHODS
// ---------------------------------------------------------------------------

/**
 * Check Analyzer API status and R2 connectivity
 */
export async function getAnalyzerHealth(): Promise<AnalyzerHealthResponse | null> {
  try {
    const res = await fetch(`${ANALYZER_BASE_URL}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to connect to Analyzer API health check:', err);
    return null;
  }
}

/**
 * Validate selfie image quality and detect face before enrolling into profile
 */
export async function analyzeSelfie(
  fileInput: NativeImageInput | Blob | File
): Promise<SelfieAnalyzeResponse> {
  const formData = await createFormDataWithFile(fileInput, 'file');

  const res = await fetch(`${ANALYZER_BASE_URL}/selfie/analyze`, {
    method: 'POST',
    body: formData,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Analyzer response error (${res.status}): ${text || res.statusText}`);
  }

  if (!res.ok) {
    throw new Error(formatApiError(data, res.status));
  }

  return data as SelfieAnalyzeResponse;
}

export interface MatchSelfieParams {
  selfieKey?: string | null;
  selfieUrl?: string | null;
  fileInput?: NativeImageInput | Blob | File | null;
  collectionScope?: string;
  threshold?: number;
}

/**
 * Match an enrolled selfie against event photos.
 * 
 * Supports:
 * - Option A: Using enrolled R2 key (`selfieKey`) or public URL (`selfieUrl`)
 * - Option B: Using freshly captured selfie (`fileInput`)
 */
export async function matchSelfieWithEvent(
  params: MatchSelfieParams
): Promise<SelfieMatchResponse> {
  const { selfieKey, selfieUrl, fileInput, collectionScope = 'default', threshold = 0.40 } = params;

  let activeFileInput: NativeImageInput | Blob | File | null = fileInput || null;

  // If no direct fileInput provided, fetch image from selfieUrl or selfieKey
  if (!activeFileInput && (selfieKey || selfieUrl)) {
    const publicBase = (
      process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev'
    ).replace(/\/+$/, '');

    let targetUrl = selfieUrl;
    if (!targetUrl && selfieKey) {
      targetUrl = selfieKey.startsWith('http')
        ? selfieKey
        : `${publicBase}/${selfieKey.replace(/^\/+/, '')}`;
    }

    if (targetUrl) {
      try {
        const imgRes = await fetch(targetUrl);
        if (!imgRes.ok) {
          throw new Error(`Could not download enrolled selfie from storage (${imgRes.status}).`);
        }
        const blob = await imgRes.blob();
        activeFileInput = blob;
      } catch (fetchErr: any) {
        console.warn('Failed to load selfie for facial match:', targetUrl, fetchErr);
        throw new Error(
          fetchErr?.message && fetchErr.message !== '[object Object]'
            ? fetchErr.message
            : 'Could not access your selfie image. Please re-upload your selfie in profile.'
        );
      }
    }
  }

  if (!activeFileInput) {
    throw new Error('Biometric selfie required. Please take a selfie in your profile first.');
  }

  const formData = await createFormDataWithFile(activeFileInput, 'file');
  if (collectionScope && collectionScope !== 'default') {
    formData.append('collection_scope', collectionScope);
  }
  formData.append('threshold', String(threshold));

  const res = await fetch(`${ANALYZER_BASE_URL}/selfie/match`, {
    method: 'POST',
    body: formData,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Analyzer response error (${res.status}): ${text || res.statusText}`);
  }

  if (!res.ok) {
    throw new Error(formatApiError(data, res.status));
  }

  return {
    total_faces_in_query: data.total_faces_in_query || 0,
    matched_photos_count: data.matched_photos_count || (Array.isArray(data.top_matches) ? data.top_matches.length : 0),
    threshold_applied: data.threshold_applied ?? threshold,
    top_matches: Array.isArray(data.top_matches) ? data.top_matches : [],
  };
}

/**
 * Index a newly uploaded photo from R2 into the Analyzer face database
 */
export async function indexPhotoInAnalyzer(
  objectKey: string,
  collectionScope = 'default',
  forceReindex = false
): Promise<IndexObjectResponse> {
  try {
    const res = await fetch(`${ANALYZER_BASE_URL}/index/r2-object`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object_key: objectKey,
        collection_scope: collectionScope,
        force_reindex: forceReindex,
      }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      return {
        object_key: objectKey,
        status: 'skipped',
        faces_detected: 0,
        message: formatApiError(data, res.status),
      };
    }

    return data as IndexObjectResponse;
  } catch (err: any) {
    console.warn(`Failed to index photo ${objectKey} in analyzer:`, err);
    return {
      object_key: objectKey,
      status: 'skipped',
      faces_detected: 0,
      message: err?.message && err.message !== '[object Object]' ? err.message : 'Network error',
    };
  }
}

/**
 * Trigger background batch indexing for an entire event folder in R2
 */
export async function batchIndexEventPhotos(
  prefix: string,
  collectionScope = 'default'
): Promise<{ job_id: string; status: string; total_items?: number } | null> {
  try {
    const res = await fetch(`${ANALYZER_BASE_URL}/index/r2-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix,
        collection_scope: collectionScope,
        force_reindex: false,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to trigger batch indexing:', err);
    return null;
  }
}
