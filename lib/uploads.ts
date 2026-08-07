/**
 * Shared upload limits and error handling for the admin's image uploads.
 *
 * Deliberately not `server-only`: the client forms check the same limits before
 * sending, so an oversized file fails instantly with an accurate message rather
 * than after a round-trip. The server actions still enforce them — the client
 * check is a courtesy, not the gate.
 *
 * Keep these under `experimental.serverActions.bodySizeLimit` in
 * next.config.ts, or the framework rejects the request before the action runs.
 */

/** Logos, sign-in photo, About photo, media-team photo. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Show cover artwork — larger because it's a portrait card image. */
export const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;

export function maxMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function tooLargeMessage(bytes: number): string {
  return `That image is too large — please use one under ${maxMb(bytes)}.`;
}

/**
 * A `redirect()` inside a server action throws a control-flow error that Next
 * uses to navigate. Catching it (to stop an upload button hanging) also
 * swallows the navigation, so an expired session would silently do nothing
 * instead of returning to the sign-in page. Re-throw these.
 */
export function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * What to tell the admin when an upload action throws rather than returning an
 * error. The overwhelmingly common cause is a body-size rejection by the
 * framework, so lead with that instead of blaming the session.
 */
export function uploadFailedMessage(limitBytes: number): string {
  return `Upload failed. Check the image is under ${maxMb(limitBytes)} and try again.`;
}
