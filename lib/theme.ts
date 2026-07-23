import type { CSSProperties } from "react";

/**
 * Shape of a school's `theme` jsonb. All optional — anything missing falls back
 * to the Liberty defaults baked into globals.css. This is the contract the
 * branding admin (Stage 7) writes and the theming layer reads.
 */
export type SchoolTheme = {
  primary?: string;
  secondary?: string;
  ink?: string;
  paper?: string;
  accentWarm?: string;
  font_key?: string;
  theme?: "light" | "dark";
};

/**
 * Display fonts currently self-hosted via next/font (see app/layout.tsx).
 * Extend this as the branding admin's font shortlist is wired up; an unknown
 * font_key simply falls back to the default display stack.
 */
const FONT_STACKS: Record<string, string> = {
  "Big Shoulders Display": "var(--font-big-shoulders), sans-serif",
  "Big Shoulders": "var(--font-big-shoulders), sans-serif",
};

/**
 * Map a school's theme tokens onto CSS-variable overrides. Applied inline on the
 * [data-app] wrapper, these cascade through the whole component tree — which is
 * exactly how the same components render as any school's brand.
 */
export function themeToCssVars(theme: SchoolTheme): CSSProperties {
  const vars: Record<string, string> = {};
  if (theme.primary) vars["--brand"] = theme.primary;
  if (theme.secondary) vars["--brand-2"] = theme.secondary;
  if (theme.ink) vars["--ink"] = theme.ink;
  if (theme.paper) vars["--paper"] = theme.paper;
  if (theme.accentWarm) vars["--accent-warm"] = theme.accentWarm;

  const stack = theme.font_key ? FONT_STACKS[theme.font_key] : undefined;
  if (stack) vars["--font-display"] = stack;

  return vars as CSSProperties;
}

/** Light/dark selects the semantic token set; defaults to dark (the design default). */
export function themeMode(theme: SchoolTheme): "light" | "dark" {
  return theme.theme === "light" ? "light" : "dark";
}
