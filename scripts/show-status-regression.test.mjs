import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }});
  return module.exports;
}
const form = { title: 'New show', slug: '', season: '', show_year: '', price: '', sale_price: '', intro_text: '', artwork_url: '', status: 'coming_soon' };
function adminActions({ video = null } = {}) {
  const writes = [];
  const query = {
    select: () => query, eq: () => query, neq: () => query, like: () => query, order: () => query,
    limit: async () => ({ data: [] }),
    maybeSingle: async () => ({ data: null }),
    insert: async data => { writes.push(data); return {}; },
    update: data => { writes.push(data); return query; },
  };
  const actions = load('app/(admin)/admin/[slug]/shows/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => { throw new Error('redirect'); } },
    '@/lib/admin': { requireAdmin: async () => {} },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: table => table === 'show_videos' ? { ...query, select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: video }) } : query }) },
    '@/lib/uploads': {}, '@/lib/media': {},
  });
  return { actions, writes };
}
test('Coming Soon can be created with no video, performances, chapters or pricing', async () => {
  const subject = adminActions();
  await assert.rejects(subject.actions.createShow('school', 'school', form), /redirect/);
  assert.equal(subject.writes.length, 1);
  assert.equal(subject.writes[0].status, 'coming_soon');
  assert.equal(subject.writes[0].price_pence, 0);
});
test('Published needs positive pricing and a full-show video', async () => {
  const subject = adminActions();
  assert.match((await subject.actions.updateShow('id', 'school', 'school', { ...form, status: 'published' })).error, /price/);
  assert.match((await subject.actions.updateShow('id', 'school', 'school', { ...form, price: '24', status: 'published' })).error, /video/);
  assert.equal(subject.writes.length, 0);
});
test('A configured show can be Published and moved back to Coming Soon', async () => {
  const subject = adminActions({ video: { full_show_bunny_video_id: 'video' } });
  await assert.rejects(subject.actions.updateShow('id', 'school', 'school', { ...form, price: '24', status: 'published' }), /redirect/);
  await assert.rejects(subject.actions.updateShow('id', 'school', 'school', form), /redirect/);
  assert.deepEqual(subject.writes.map(s => s.status), ['published', 'coming_soon']);
});
test('Unknown statuses are rejected server-side', async () => {
  const subject = adminActions();
  assert.match((await subject.actions.createShow('school', 'school', { ...form, status: 'other' })).error, /status/);
  assert.equal(subject.writes.length, 0);
});
function checkout(status) {
  let sessions = 0, orders = 0;
  const filters = {};
  const query = {
    select: () => query, eq: (key, value) => { filters[key] = value; return query; },
    maybeSingle: async () => ({ data: filters.status === status ? { id: 'show', slug: 'show', title: 'Show', price_pence: 2400, sale_price_pence: null } : null }),
  };
  const action = load('app/(platform)/checkout/actions.ts', {
    '@/lib/auth': { getUser: async () => ({ id: 'viewer' }) },
    '@/lib/school': { getCurrentSchool: async () => ({ id: 'school' }) },
    '@/lib/supabase/server': { createClient: async () => ({ from: table => table === 'shows' ? query : { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null }) } }) },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: () => { orders++; return { select: () => ({ single: async () => ({ data: { id: 'order' } }) }) }; }, update: () => ({ eq: async () => ({}) }) }) }) },
    '@/lib/stripe': { getStripe: () => ({ checkout: { sessions: { create: async () => { sessions++; return { id: 'session', url: 'https://checkout.test' }; } } } }) },
    '@/lib/url': { getOrigin: async () => 'https://school.test' },
  });
  return { run: () => action.createCheckoutSession('show'), counts: () => ({ sessions, orders }) };
}
for (const status of ['coming_soon', 'draft']) test(`${status} cannot create checkout or an order`, async () => {
  const subject = checkout(status);
  assert.match((await subject.run()).error, /available/);
  assert.deepEqual(subject.counts(), { sessions: 0, orders: 0 });
});
test('Published checkout retains the existing purchase flow', async () => {
  const subject = checkout('published');
  assert.equal((await subject.run()).url, 'https://checkout.test');
  assert.deepEqual(subject.counts(), { sessions: 1, orders: 1 });
});
for (const component of ['ShowCard', 'FeaturedShow']) test(`${component}: Coming Soon opens the message rather than checkout or an owned link`, () => {
  const marker = () => null;
  let opened = false;
  const dependencies = {
    react: { useState: () => [false, value => { opened = value; }] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    './OwnedShowLink': { ShowCardAction: marker },
    '@/app/(platform)/shows/shop.module.css': { default: {} },
  };
  for (const name of ['ShowPrice', 'CheckoutModal', 'CoverImage', 'ComingSoonModal']) dependencies[`@/components/platform/${name}`] = { default: () => null };
  const render = () => load(`components/platform/${component}.tsx`, dependencies).default({ show: { ...form, status: 'coming_soon', owned: true }, email: 'viewer@example.test' });
  const tree = render();
  const action = tree.props.children[0];
  assert.equal(action.props.owned, false);
  action.props.onPurchase();
  assert.equal(opened, true);
  dependencies.react.useState = () => [true, () => {}];
  assert.equal(render().props.children[1].type, dependencies['@/components/platform/ComingSoonModal'].default);
});

for (const status of ['coming_soon', 'draft', 'published']) test(`${status}: playback and download actions require Published even for admin-visible rows`, async () => {
  let upserts = 0;
  const actions = load('app/(platform)/show/[slug]/embed-actions.ts', {
    '@/lib/auth': { getUser: async () => ({ id: 'admin' }) },
    '@/lib/bunny': { bunnyEmbedUrl: id => `https://player.test/${id}` },
    '@/lib/supabase/server': { createClient: async () => ({ from: table => {
      const filters = {};
      const query = {
        select: () => query,
        eq: (key, value) => { filters[key] = value; return query; },
        maybeSingle: async () => ({ data: filters['shows.status'] === status ? {
          full_show_bunny_video_id: 'full', download_url: 'https://download.test',
          video_source: 'standalone', bunny_video_id: 'dance',
        } : null }),
        upsert: async () => { upserts++; },
      };
      return query;
    } }) },
  });
  for (const kind of ['full', 'perf']) {
    const source = await actions.getEmbedUrl(kind, 'id');
    assert.equal(Boolean(source), status === 'published');
  }
  const download = await actions.getFullShowDownloadUrl('id');
  assert.equal(Boolean(download), status === 'published');
  assert.equal(upserts, status === 'published' ? 1 : 0);
});
