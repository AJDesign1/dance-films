import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const origin = 'https://test.supabase.co';
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, URL, process: { env: { NEXT_PUBLIC_SUPABASE_URL: origin } }, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  } });
  return module.exports;
}

test('Storage loader bypasses the host optimizer with responsive, aspect-safe transforms', () => {
  const { storageImageLoader } = load('lib/storageImage.ts');
  const url = new URL(storageImageLoader({ src: `${origin}/storage/v1/object/public/artwork/school/photo.jpg`, width: 640 }));
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, '/storage/v1/render/image/public/artwork/school/photo.jpg');
  assert.equal(url.searchParams.get('width'), '640');
  assert.equal(url.searchParams.get('height'), '640');
  assert.equal(url.searchParams.get('resize'), 'contain');
  assert.equal(url.searchParams.get('quality'), '78');
  assert.ok(!url.href.includes('/_next/image'));
  const retina = new URL(storageImageLoader({ src: `${origin}/storage/v1/object/public/artwork/school/photo.jpg`, width: 3840 }));
  assert.equal(retina.searchParams.get('width'), '2500');
});

test('SVG, GIF, local assets, other hosts and private URLs are not rewritten', () => {
  const { storageImageSrc } = load('lib/storageImage.ts');
  for (const src of ['/brand/logo.svg', `${origin}/storage/v1/object/public/branding/s/logo.svg`, `${origin}/storage/v1/object/public/branding/s/animated.gif`, `${origin}/storage/v1/object/sign/artwork/s/image.jpg?token=private`, 'https://other.supabase.co/storage/v1/object/public/artwork/image.jpg']) {
    assert.equal(storageImageSrc(src, 800), src);
  }
});

test('Metadata lookup only returns title/alt for authorised, in-school Storage URLs', async () => {
  const selected = [];
  const query = { select: columns => { selected.push(columns); return query; }, eq: () => query, in: async () => ({ data: [{ bucket: 'artwork', storage_path: 'school/photo.jpg', title: 'Show poster', alt_text: 'Dancers on stage', description: 'Not public' }], error: null }) };
  const { imageMetadata } = load('lib/media.ts', { 'server-only': {}, 'next/cache': { unstable_cache: fn => fn }, '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => query }) } });
  const src = `${origin}/storage/v1/object/public/artwork/school/photo.jpg`;
  const result = await imageMetadata('school', [src, `${origin}/storage/v1/object/public/artwork/other/photo.jpg`, 'https://video.b-cdn.net/private-video-id/thumbnail.jpg']);
  assert.deepEqual(Object.keys(result), [src]);
  assert.equal(result[src].alt_text, 'Dancers on stage');
  assert.equal(result[src].description, undefined);
  assert.deepEqual(selected, ['bucket, storage_path, title, alt_text']);
});

test('Empty/Bunny-only metadata requests do not invoke a database query', async () => {
  const { imageMetadata } = load('lib/media.ts', { 'server-only': {}, 'next/cache': { unstable_cache: fn => fn }, '@/lib/supabase/admin': { createAdminClient: () => { throw new Error('Must not query'); } } });
  assert.equal(Object.keys(await imageMetadata('school', ['https://video.b-cdn.net/private-video-id/thumbnail.jpg'])).length, 0);
});

test('Media catalogue policy is admin-only and inherited TRUNCATE is explicitly revoked', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261016193000_media_library.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.media_assets from anon, authenticated/);
  assert.match(sql, /using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
  assert.doesNotMatch(sql, /grant .*delete.*to authenticated/i);
});
