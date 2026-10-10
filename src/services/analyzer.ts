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
    throw new Error(data.detail || `Analysis failed with status ${res.status}`);
  }

  return data as SelfieAnalyzeResponse;
}

/**
 * Match an enrolled selfie against event photos.
 * 
 * Supports:
 * - Option A: Using existing R2 key (`selfieKey`, e.g. "selfies/user123_456.jpg")
 * - Option B: Using freshly captured selfie (`fileInput`)
 */
export async function matchSelfieWithEvent(params: {
  selfieKey?: string;
  fileInput?: NativeImageInput | Blob | File;
  collectionScope?: string;
  threshold?: number;
}): Promise<SelfieMatchResponse> {
  const { selfieKey, fileInput, collectionScope = 'default', threshold = 0.40 } = params;

  if (selfieKey) {
    // JSON matching using already enrolled R2 key
    const res = await fetch(`${ANALYZER_BASE_URL}/selfie/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selfie_image_key: selfieKey,
        collection_scope: collectionScope,
        threshold,
      }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Analyzer response error (${res.status}): ${text || res.statusText}`);
    }

    if (!res.ok) {
      throw new Error(data.detail || `Matching failed with status ${res.status}`);
    }

    return data as SelfieMatchResponse;
  }

  if (fileInput) {
    // Multipart upload matching
    const formData = await createFormDataWithFile(fileInput, 'file');
    formData.append('collection_scope', collectionScope);
    formData.append('threshold', String(threshold));

    const res = await fetch(`${ANALYZER_BASE_URL}/match/upload`, {
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
      throw new Error(data.detail || `Matching upload failed with status ${res.status}`);
    }

    return data as SelfieMatchResponse;
  }

  throw new Error('Either selfieKey or fileInput must be provided to matchSelfieWithEvent.');
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
        message: data.detail || 'Indexing failed',
      };
    }

    return data as IndexObjectResponse;
  } catch (err: any) {
    console.warn(`Failed to index photo ${objectKey} in analyzer:`, err);
    return {
      object_key: objectKey,
      status: 'skipped',
      faces_detected: 0,
      message: err.message || 'Network error',
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
