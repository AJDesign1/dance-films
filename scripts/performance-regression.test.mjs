import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Execute the real route/action while replacing only its server dependencies.
// In particular, cached image bytes must never bypass the route's access check.
function load(relativePath, dependencies) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, Buffer, Uint8Array, Response, Headers,
    process: { env: {} },
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

function entryMiddleware({ refresh = false } = {}) {
  const next = require("next/server");
  let authCalls = 0;
  const { middleware } = load("middleware.ts", {
    "next/server": next,
    "@/lib/tenant": {
      SCHOOL_SLUG_HEADER: "x-school-slug",
      schoolSlugFromHost: (host, params) => params.get("school") || (host === "liberty.dancefilms.co.uk" ? "liberty" : null),
    },
    "@/lib/cookieDomain": { sharedCookieDomain: () => undefined },
    "@supabase/ssr": { createServerClient: (_url, _key, { cookies }) => ({ auth: {
      getClaims: async () => {
        authCalls++;
        if (refresh) cookies.setAll([{ name: "sb-test", value: "refreshed", options: { path: "/" } }]);
        return { data: { claims: { sub: "viewer" } } };
      },
      getUser: async () => { throw new Error("Unexpected remote auth lookup"); },
    } }) },
  });
  return {
    authCalls: () => authCalls,
    request: (url, cookie) => middleware(new next.NextRequest(url, {
      headers: { host: new URL(url).host, ...(cookie ? { cookie } : {}) },
    })),
  };
}

test("signed-out school entry serves login without a redirect or auth call", async () => {
  const subject = entryMiddleware();
  const response = await subject.request("https://liberty.dancefilms.co.uk/?from=poster");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-middleware-rewrite"), "https://liberty.dancefilms.co.uk/login?from=poster");
  assert.equal(response.headers.get("x-middleware-request-x-school-slug"), "liberty");
  assert.equal(subject.authCalls(), 0);
});

test("signed-in entry rewrite survives session refresh and forwards fresh cookies", async () => {
  const subject = entryMiddleware({ refresh: true });
  const response = await subject.request("https://liberty.dancefilms.co.uk/", "sb-test=old");
  assert.equal(response.headers.get("x-middleware-rewrite"), "https://liberty.dancefilms.co.uk/shows");
  assert.match(response.headers.get("x-middleware-request-cookie"), /sb-test=refreshed/);
  assert.match(response.headers.get("set-cookie"), /sb-test=refreshed/);
  assert.equal(subject.authCalls(), 1);
});

test("entry optimisation leaves apex, admin and explicit routes unchanged", async () => {
  const subject = entryMiddleware();
  const apex = await subject.request("https://dancefilms.co.uk/");
  assert.equal(apex.headers.get("x-middleware-rewrite"), "https://dancefilms.co.uk/coming-soon");
  for (const path of ["/admin/liberty", "/auth/confirm", "/show/summer", "/login"]) {
    const response = await subject.request(`https://liberty.dancefilms.co.uk${path}`);
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
  }
  const preview = await subject.request("http://localhost:3100/?school=liberty");
  assert.equal(preview.headers.get("x-middleware-rewrite"), "http://localhost:3100/login?school=liberty");
});

function query(data, selected) {
  const chain = {
    select: (columns) => { selected?.push(columns); return chain; },
    eq: () => chain,
    maybeSingle: async () => ({ data }),
  };
  return chain;
}

function thumbnail({ user = { id: "viewer" }, row = { thumbnail_url: "https://source/image.webp" }, fail = false } = {}) {
  const calls = [];
  const route = load("app/api/thumbnail/[kind]/[id]/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/auth": { getUser: async () => { calls.push("auth"); return user; } },
    "@/lib/supabase/server": { createClient: async () => ({ from: () => { calls.push("rls"); return query(row); } }) },
    "@/lib/poster-cache": { getProcessedPoster: async () => {
      calls.push("cached-image");
      if (fail) throw new Error("upstream failed");
      return Buffer.from("already-cached-image").toString("base64");
    } },
  });
  return { calls, get: (kind = "perf") => route.GET(new Request("https://example.test"), { params: Promise.resolve({ kind, id: "test" }) }) };
}

test("signed-out callers cannot read a warmed poster cache", async () => {
  const route = thumbnail({ user: null });
  assert.equal((await route.get()).status, 404);
  assert.deepEqual(route.calls, ["auth"]);
});

test("signed-in but non-entitled callers cannot read a warmed poster cache", async () => {
  const route = thumbnail({ row: null }); // RLS hides the row.
  assert.equal((await route.get()).status, 404);
  assert.deepEqual(route.calls, ["auth", "rls"]);
});

test("an authorised poster request checks RLS before cache and stays private", async () => {
  const route = thumbnail();
  const response = await route.get();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "already-cached-image");
  assert.equal(response.headers.get("cache-control"), "private, max-age=3600");
  assert.deepEqual(route.calls, ["auth", "rls", "cached-image"]);
});

test("a failed poster source is not a cacheable successful response", async () => {
  const response = await thumbnail({ fail: true }).get();
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("invalid poster kinds do not reach auth, data or image processing", async () => {
  const route = thumbnail();
  assert.equal((await route.get("invalid")).status, 404);
  assert.deepEqual(route.calls, []);
});

function playback(row) {
  let requests = 0;
  const actions = load("app/(platform)/show/[slug]/embed-actions.ts", {
    "@/lib/auth": { getUser: async () => ({ id: "viewer" }) },
    "@/lib/supabase/server": { createClient: async () => ({ from: () => { requests++; return query(row); } }) },
    "@/lib/bunny": { bunnyEmbedUrl: (id) => `https://player.test/${id}` },
  });
  return { actions, requests: () => requests };
}

test("chapter playback uses one data request and preserves start/end times", async () => {
  const subject = playback({ video_source: "show", clip_start_seconds: 25, clip_end_seconds: 85, shows: { show_videos: { full_show_bunny_video_id: "full-show" } } });
  const result = await subject.actions.getEmbedUrl("perf", "chapter");
  assert.equal(result.url, "https://player.test/full-show");
  assert.equal(result.startSeconds, 25);
  assert.equal(result.endSeconds, 85);
  assert.equal(subject.requests(), 1);
});

test("standalone playback does not require a related full-show video", async () => {
  const subject = playback({ video_source: "standalone", bunny_video_id: "solo", shows: null });
  const result = await subject.actions.getEmbedUrl("perf", "standalone");
  assert.equal(result.url, "https://player.test/solo");
  assert.equal(result.startSeconds, null);
  assert.equal(subject.requests(), 1);
});

test("RLS-hidden performances and related videos never produce playback URLs", async () => {
  for (const row of [null, { video_source: "show", shows: null }, { video_source: "show", shows: { show_videos: null } }]) {
    const subject = playback(row);
    assert.equal(await subject.actions.getEmbedUrl("perf", "hidden"), null);
    assert.equal(subject.requests(), 1);
  }
});

for (const name of ["shows", "show/[slug]"]) {
  test(`${name}: page data starts before the profile gate resolves, but no page is returned early`, { timeout: 2000 }, async () => {
    let releaseProfile;
    let notifyRpc;
    const profile = new Promise((resolve) => { releaseProfile = resolve; });
    const rpcStarted = new Promise((resolve) => { notifyRpc = resolve; });
    const dependencies = {
      "react/jsx-runtime": require("react/jsx-runtime"),
      "next/navigation": { notFound: () => { throw new Error("not found"); } },
      "next/link": { default: () => null },
      "@/lib/auth": { requireOnboardedProfile: () => profile },
      "@/lib/school": { getCurrentSchool: async () => ({ id: "school", name: "School" }) },
      "@/lib/format": {},
      "@/lib/supabase/server": { createClient: async () => ({ rpc: async () => {
        notifyRpc();
        return { data: name === "shows" ? [] : { show: { slug: "show", title: "Show" }, owned: false }, error: null };
      } }) },
      "./shop.module.css": { default: {} },
      "./show.module.css": { default: {} },
    };
    for (const component of ["PlatformHeader", "Footer", "FeaturedShow", "CoverImage", "ShowCard", "BuyButton", "ShowExperience", "ShowPrice"]) {
      dependencies[`@/components/platform/${component}`] = { default: () => null };
    }
    const page = load(`app/(platform)/${name}/page.tsx`, dependencies).default;
    let completed = false;
    const result = page({ params: Promise.resolve({ slug: "show" }), searchParams: Promise.resolve({}) });
    result.then(() => { completed = true; });
    await rpcStarted;
    assert.equal(completed, false);
    releaseProfile({ name: "Viewer", email: "viewer@example.test" });
    assert.ok(await result);
  });
}
