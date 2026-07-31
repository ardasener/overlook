import { theme as antdThemeKit, type ThemeConfig } from "antd";
import type { Palette } from "./palettes";

export const UI_SCALE_DEFAULT = 1;
export const UI_SCALE_MIN = 0.5;
export const UI_SCALE_MAX = 2;
export const UI_SCALE_STEP = 0.25;

/** Base UI font size before the relational scale is applied. */
export const UI_FONT_SIZE_BASE = 14;

export const UI_FONT_STACKS = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "noto-sans": "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export type UiFontId = keyof typeof UI_FONT_STACKS;

export function antdTheme(
  palette: Palette,
  uiFont: UiFontId,
  uiScale: number,
): ThemeConfig {
  return {
    algorithm:
      palette.kind === "dark"
        ? antdThemeKit.darkAlgorithm
        : antdThemeKit.defaultAlgorithm,
    token: {
      colorPrimary: palette.primary,
      colorInfo: palette.primary,
      colorBgBase: palette.bg,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.surfaceAlt,
      colorBgLayout: palette.bg,
      colorText: palette.text,
      colorTextSecondary: palette.textSecondary,
      colorTextTertiary: palette.textMuted,
      colorTextQuaternary: palette.textMuted,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      fontFamily: UI_FONT_STACKS[uiFont],
      fontSize: UI_FONT_SIZE_BASE * uiScale,
      borderRadius: 4,
    },
    components: {
      Layout: {
        // The dark Sider otherwise falls back to AntD's hardcoded #001529,
        // which belongs to no palette and ignores theme changes.
        siderBg: palette.surface,
      },
      Tabs: {
        // Lean tab strip: the accent-colored titles carry tab/panel state,
        // so AntD's ink bar is suppressed and cards blend with the surface.
        cardBg: palette.surface,
        itemColor: palette.textSecondary,
        itemSelectedColor: palette.text,
        itemHoverColor: palette.text,
        inkBarColor: "transparent",
        titleFontSize: 13,
        horizontalItemGutter: 4,
      },
    },
  };
}
