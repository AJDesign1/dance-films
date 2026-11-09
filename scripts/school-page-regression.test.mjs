import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, crypto: globalThis.crypto, File, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }});
  return module.exports;
}
const root = 'https://storage.example/storage/v1/object/public/branding/';
const form = { aboutText: 'Introduction', aboutImageUrl: root + 'school/about.jpg', galleryImageUrls: [root + 'school/b.jpg', root + 'school/a.jpg'], quoteText: ' A personal note. ', quoteName: ' Alex Jarvis ', quoteRole: ' Founder, Dance Films ' };
function subject({ authorized = true, fail = false, exists = true } = {}) {
  const writes = [], filters = [], invalidated = [];
  const query = {
    update: row => { writes.push(row); return query; },
    eq: (key, value) => { filters.push([key, value]); return query; },
    select: () => query,
    maybeSingle: async () => ({ data: exists ? { id: 'school' } : null, error: fail ? {} : null }),
  };
  const actions = load('app/(admin)/admin/[slug]/school-page/actions.ts', {
    'next/cache': { revalidatePath: p => invalidated.push(p), revalidateTag: t => invalidated.push(t) },
    '@/lib/admin': { requireAdmin: async () => { if (!authorized) throw Error('Unauthorized'); } },
    '@/lib/school': { SCHOOLS_CACHE_TAG: 'schools' },
    '@/lib/media': { storageReference: url => url.startsWith(root) ? { bucket: 'branding', path: url.slice(root.length) } : null },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => query }) },
  });
  return { ...actions, writes, filters, invalidated };
}
test('CMS saves ordered gallery, quote and unchanged introduction for only the selected school', async () => {
  const s = subject();
  assert.equal((await s.updateSchoolPage('school', 'liberty', form)).ok, true);
  const saved = JSON.parse(JSON.stringify(s.writes[0]));
  assert.deepEqual(saved.gallery_image_urls, form.galleryImageUrls);
  assert.equal(saved.quote_text, 'A personal note.');
  assert.equal(saved.quote_name, 'Alex Jarvis');
  assert.equal(saved.quote_role, 'Founder, Dance Films');
  assert.equal(saved.about_text, form.aboutText);
  assert.equal(saved.about_image_url, form.aboutImageUrl);
  assert.deepEqual(s.filters, [['id', 'school'], ['slug', 'liberty']]);
  assert.deepEqual(s.invalidated, ['/admin/liberty/school-page', 'schools']);
});
test('CMS accepts gallery removal/reordering and either section independently', async () => {
  for (const value of [
    { ...form, galleryImageUrls: [form.galleryImageUrls[1]], quoteText: '' },
    { ...form, galleryImageUrls: [] },
    { ...form, galleryImageUrls: [], quoteText: '  ', quoteName: '', quoteRole: '' },
  ]) {
    const s = subject();
    assert.equal((await s.updateSchoolPage('school', 'liberty', value)).ok, true);
    assert.equal(s.writes[0].quote_text, value.quoteText.trim() || null);
    assert.equal(s.writes[0].gallery_image_urls.length, value.galleryImageUrls.length);
  }
});
test('server rejects overflow, duplicates, malformed and cross-school gallery images', async () => {
  for (const value of [
    { ...form, galleryImageUrls: Array.from({ length: 7 }, (_, i) => root + `school/${i}.jpg`) },
    { ...form, galleryImageUrls: [form.galleryImageUrls[0], form.galleryImageUrls[0]] },
    { ...form, galleryImageUrls: [root + 'other-school/photo.jpg'] },
    { ...form, galleryImageUrls: ['javascript:alert(1)'] },
    { ...form, galleryImageUrls: [null] },
    { ...form, quoteText: 'x'.repeat(5001) },
    null,
  ]) {
    const s = subject();
    assert.ok((await s.updateSchoolPage('school', 'liberty', value)).error);
    assert.equal(s.writes.length, 0);
  }
});
test('unauthorized requests cannot save, and failed/missing-school saves cannot report success', async () => {
  const s = subject({ authorized: false });
  await assert.rejects(s.updateSchoolPage('school', 'liberty', form), /Unauthorized/);
  assert.equal(s.writes.length, 0);
  for (const opts of [{ fail: true }, { exists: false }]) {
    const failed = subject(opts);
    assert.ok((await failed.updateSchoolPage('school', 'liberty', form)).error);
    assert.equal(failed.invalidated.length, 0);
  }
});
test('gallery upload uses school-scoped storage and registers the uploaded media', async () => {
  const stored = [], registered = [];
  const actions = load('app/(admin)/admin/[slug]/branding/actions.ts', {
    'next/cache': {}, 'next/navigation': {}, '@/lib/school': {},
    '@/lib/admin': { requireAdmin: async () => {} },
    '@/lib/uploads': { MAX_IMAGE_BYTES: 2 * 1024 * 1024, tooLargeMessage: () => 'Too large' },
    '@/lib/media': { registerMedia: async (...args) => registered.push(args) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ storage: { from: bucket => ({
      upload: async (path, file, options) => { stored.push({ bucket, path, size: file.size, options }); return {}; },
      getPublicUrl: path => ({ data: { publicUrl: root + path } }),
    }) } }) },
  });
  const file = new File(['photo bytes'], 'backstage.jpg', { type: 'image/jpeg' });
  const result = await actions.uploadBrandingImage('school', 'gallery', { get: () => file });
  assert.match(result.url, /school\/gallery-.+\.jpg$/);
  assert.equal(stored[0].bucket, 'branding');
  assert.equal(stored[0].options.cacheControl, '31536000');
  assert.equal(registered[0][0], 'school');
  assert.equal(registered[0][2], stored[0].path);
});
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const styles = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
test('empty optional sections render nothing; quote renders without a photograph', () => {
  const { default: Quote } = load('app/(platform)/shows/SchoolQuote.tsx', { 'react/jsx-runtime': require('react/jsx-runtime'), './shop.module.css': styles });
  assert.equal(renderToStaticMarkup(React.createElement(Quote, { text: ' ', name: 'Alex' })), '');
  const html = renderToStaticMarkup(React.createElement(Quote, { text: 'Personal note', name: 'Alex', role: 'Founder' }));
  assert.match(html, /blockquote/); assert.match(html, /Personal note/); assert.doesNotMatch(html, /<img/);
  const { default: Gallery } = load('app/(platform)/shows/SchoolGallery.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'), './shop.module.css': styles,
    '@/components/platform/CoverImage': { default: () => React.createElement('img') },
    '@/components/platform/ImageMetadata': { useImageMetadata: () => null },
  });
  assert.equal(renderToStaticMarkup(React.createElement(Gallery, { images: [], schoolName: 'Liberty' })), '');
  for (const count of [1, 4, 6, 7]) {
    const html = renderToStaticMarkup(React.createElement(Gallery, { images: Array.from({ length: count }, (_, i) => String(i)), schoolName: 'Liberty' }));
    assert.equal((html.match(/<img/g) ?? []).length, Math.min(count, 6));
  }
});
