/*
 * Turn Bunny's inline MP4 response into a real browser download without
 * proxying multi-gigabyte video files through Netlify. The response body stays
 * streamed from Bunny; this worker only supplies the attachment header that
 * Bunny Stream's generated MP4 URLs do not include.
 */

const DOWNLOAD_PATH = "/download/file";
const VIDEO_PATH = /^\/[0-9a-f-]{36}\/play_[0-9]+p\.mp4$/i;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname !== DOWNLOAD_PATH
  ) {
    return;
  }

  event.respondWith(downloadResponse(event.request, requestUrl));
});

async function downloadResponse(request, requestUrl) {
  const sourceParam = requestUrl.searchParams.get("source");
  const filename = safeFilename(requestUrl.searchParams.get("filename"));
  let source;

  try {
    source = new URL(sourceParam || "");
  } catch {
    return new Response("Invalid download link.", { status: 400 });
  }

  if (
    source.protocol !== "https:" ||
    !source.hostname.endsWith(".b-cdn.net") ||
    !VIDEO_PATH.test(source.pathname)
  ) {
    return new Response("Invalid download source.", { status: 400 });
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");
  if (range) upstreamHeaders.set("Range", range);

  let upstream;
  try {
    upstream = await fetch(source, {
      headers: upstreamHeaders,
      referrer: `${self.location.origin}/`,
      referrerPolicy: "origin",
    });
  } catch {
    return new Response("The video download could not be started.", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("The video download is currently unavailable.", {
      status: upstream.status,
    });
  }

  const headers = new Headers();
  for (const name of ["content-length", "content-range", "content-type", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function safeFilename(value) {
  const base = (value || "dance-show.mp4")
    .replace(/[^a-z0-9._ -]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const named = base || "dance-show.mp4";
  return named.toLowerCase().endsWith(".mp4") ? named : `${named}.mp4`;
}
