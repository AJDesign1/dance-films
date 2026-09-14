/**
 * Magic-link destinations originate in our own server actions, but they travel
 * through an emailed URL before coming back to the app. Keep the final redirect
 * on this origin even if somebody edits the query string manually.
 */
export function safeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/shows";
  return value;
}
