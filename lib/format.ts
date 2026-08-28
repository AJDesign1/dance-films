/** £24 from 2400; £24.50 from 2450. */
export function formatPrice(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

/** "Sarah" from "Sarah Bailey"; falls back to a friendly default. */
export function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0];
}

/** 252 → "4:12" (performance length). */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * 4360 → "1:12:40"; 765 → "12:45" (an editable clock value, not a label).
 *
 * Unlike formatDuration this keeps hours, because it round-trips through admin
 * inputs — full-show length, and the start/end timestamps of a dance taken from
 * inside a show recording, which routinely run past an hour. Parsed back by
 * parseClock().
 */
export function formatClock(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/**
 * "4:12" → 252, "1:12:40" → 4360, "90" → 90, "" → null.
 *
 * Accepts what an admin would naturally type off a video scrubber, including a
 * bare number of seconds. Returns null rather than 0 for unparseable input, so
 * a typo clears the field instead of silently seeking to the start.
 */
export function parseClock(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const parts = t.split(":").map((x) => parseInt(x, 10));
  if (parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** 4360 → "1h 13m"; 3500 → "58m" (full-show runtime). */
export function formatRuntime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "SB" from "Sarah Bailey". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
