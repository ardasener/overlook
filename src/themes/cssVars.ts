import type { CSSProperties } from "react";
import type { Palette } from "./palettes";

/**
 * CSS custom properties derived from the palette. Applied on the document root
 * so the whole page (including portals) inherits theme colors.
 */
export function paletteCssVars(palette: Palette, uiScale = 1): CSSProperties {
  return {
    "--ol-bg": palette.bg,
    "--ol-surface": palette.surface,
    "--ol-surface-alt": palette.surfaceAlt,
    "--ol-border": palette.border,
    "--ol-text": palette.text,
    "--ol-text-secondary": palette.textSecondary,
    "--ol-text-muted": palette.textMuted,
    "--ol-primary": palette.primary,
    "--ol-accent-0": palette.accents[0],
    "--ol-accent-1": palette.accents[1],
    "--ol-accent-2": palette.accents[2],
    "--ol-scale": String(uiScale),
  } as CSSProperties;
}

/**
 * Applies palette variables to an element. Custom properties MUST be set via
 * setProperty — direct assignment on a CSSStyleDeclaration is a silent no-op.
 */
export function applyPaletteVars(el: HTMLElement, palette: Palette, uiScale = 1): void {
  const vars = paletteCssVars(palette, uiScale) as Record<string, string>;
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}
