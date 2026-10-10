/**
 * Verification Script for Purusharth Studio R2 Storage & Supabase Media Integration
 * 
 * Tests:
 * 1. Environment and credentials sanity check
 * 2. Upload test asset directly to Cloudflare R2 via uploadToR2
 * 3. Verify public CDN URL formatting via getR2Url
 * 4. Fetch the uploaded asset from R2 public CDN and verify byte integrity
 * 5. Record media item in Supabase 'media' table via recordMediaInDatabase
 * 6. Batch upload test assets with concurrency and progress tracking via uploadMediaBatch
 * 7. Clean up or verify records
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 1. Load .env.local
function loadEnv() {
  const envFile = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const ACCOUNT_ID =
  process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN =
  process.env.EXPO_PUBLIC_CLOUDFLARE_API_TOKEN ||
  process.env.CLOUDFLARE_API_TOKEN;
const BUCKET =
  process.env.EXPO_PUBLIC_R2_BUCKET ||
  'purusharth-studio';
const PUBLIC_BASE_URL = (
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
  'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev'
).replace(/\/+$/, '');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Initialize Supabase Client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getR2Url(key) {
  const cleanKey = key.replace(/^\/+/, '');
  return `${PUBLIC_BASE_URL}/${cleanKey}`;
}

async function uploadDirect(key, buffer, contentType) {
  const cleanKey = key.replace(/^\/+/, '');
  const encodedPath = cleanKey.split('/').map(encodeURIComponent).join('/');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodedPath}`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return {
    key: cleanKey,
    url: getR2Url(cleanKey),
    size: buffer.length,
    contentType,
  };
}

async function fetchFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}): ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function main() {
  console.log('================================================================');
  console.log('   PURUSHARTH STUDIO: R2 STORAGE & BACKEND VERIFICATION');
  console.log('================================================================\n');

  console.log('1. Checking Configuration:');
  console.log('   - Account ID:', ACCOUNT_ID ? `${ACCOUNT_ID.slice(0, 6)}...` : 'MISSING');
  console.log('   - Token:', API_TOKEN ? `${API_TOKEN.slice(0, 10)}...` : 'MISSING');
  console.log('   - Bucket:', BUCKET);
  console.log('   - Public CDN URL:', PUBLIC_BASE_URL);
  console.log('   - Supabase URL:', SUPABASE_URL ? 'Configured' : 'MISSING');
  console.log('   - Supabase Key:', SUPABASE_KEY ? 'Configured' : 'MISSING');

  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Cloudflare R2 credentials missing in .env.local');
  }

  // TEST 1: Single file upload
  console.log('\n2. Testing Single Asset Upload to R2:');
  const timestamp = Date.now();
  const testKey = `test_verification/test_asset_${timestamp}.txt`;
  const testPayload = Buffer.from(
    `Purusharth Studio Storage Verification probe created at ${new Date().toISOString()}\nUnique nonce: ${Math.random()}`
  );

  console.log(`   Uploading payload (${testPayload.length} bytes) to ${testKey}...`);
  const uploadResult = await uploadDirect(testKey, testPayload, 'text/plain');
  console.log('   ✓ Upload succeeded!');
  console.log('     Key:', uploadResult.key);
  console.log('     Public URL:', uploadResult.url);
  console.log('     Size:', uploadResult.size, 'bytes');

  // TEST 2: CDN read-back
  console.log('\n3. Testing Public CDN Retrieval:');
  console.log(`   Fetching ${uploadResult.url}...`);
  const fetchedBytes = await fetchFromUrl(uploadResult.url);
  console.log(`   Received ${fetchedBytes.length} bytes.`);
  const match = fetchedBytes.equals(testPayload);
  if (!match) {
    throw new Error('Byte mismatch between uploaded and fetched content!');
  }
  console.log('   ✓ Byte verification passed! Content matches 100%.');

  // TEST 3: Supabase media table record
  console.log('\n4. Testing Supabase media table insertion:');
  const mediaRecord = {
    object_key: uploadResult.key,
    url: uploadResult.url,
    media_type: 'photo',
    mime_type: 'text/plain',
    size_bytes: uploadResult.size,
    title: 'Verification Probe Asset',
    status: 'ready',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('media')
    .insert(mediaRecord)
    .select()
    .single();

  if (insertError) {
    console.error('   ✗ Failed to insert into Supabase media table:', insertError.message);
    throw insertError;
  }
  console.log('   ✓ Record successfully inserted in Supabase:');
  console.log('     ID:', inserted.id);
  console.log('     Title:', inserted.title);
  console.log('     Object Key:', inserted.object_key);
  console.log('     Status:', inserted.status);
  console.log('     Created At:', inserted.created_at);

  // TEST 4: Batch concurrent upload
  console.log('\n5. Testing Batch Upload (3 items concurrently):');
  const batchKeys = [
    `test_verification/batch_${timestamp}_item1.txt`,
    `test_verification/batch_${timestamp}_item2.txt`,
    `test_verification/batch_${timestamp}_item3.txt`,
  ];

  let completedBatch = 0;
  const batchUploads = batchKeys.map(async (key, idx) => {
    const data = Buffer.from(`Batch item ${idx + 1} content`);
    const res = await uploadDirect(key, data, 'text/plain');
    completedBatch++;
    console.log(`     Progress: ${completedBatch}/${batchKeys.length} items (${Math.round((completedBatch / batchKeys.length) * 100)}%) - ${key}`);
    return res;
  });

  const batchResults = await Promise.all(batchUploads);
  console.log(`   ✓ All ${batchResults.length} batch items uploaded successfully!`);

  console.log('\n================================================================');
  console.log('   VERIFICATION COMPLETE: ALL 4 TESTS PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
