/* Create the public `photos` storage bucket for user-uploaded images (spec 07/09). One-shot.
 * Run: node scripts/db/create-photos-bucket.mjs
 * Registry: docs/SCRIPTS_REGISTRY.md (one-shot — delete after the bucket exists). */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: existing } = await admin.storage.getBucket('photos');
if (existing) {
  console.log('photos bucket already exists');
} else {
  const { error } = await admin.storage.createBucket('photos', {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (error) throw error;
  console.log('created public photos bucket (5 MB, images only)');
}
