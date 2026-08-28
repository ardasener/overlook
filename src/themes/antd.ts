import { theme as antdThemeKit, type ThemeConfig } from "antd";
import type { Palette } from "./palettes";

export const UI_SCALE_DEFAULT = 1;
export const UI_SCALE_MIN = 0.5;
export const UI_SCALE_MAX = 2;
export const UI_SCALE_STEP = 0.25;

/** Base UI font size before the relational scale is applied. */
export const UI_FONT_SIZE_BASE = 14;

export const DEFAULT_UI_FONT = "Inter";

export type UiFontId = string;

export function uiFontStack(family: UiFontId): string {
  return `'${family.replace(/'/g, "\\'")}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
}

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
      fontFamily: uiFontStack(uiFont),
      fontSize: UI_FONT_SIZE_BASE * uiScale,
      borderRadius: 4,
    },
    components: {
      Layout: {
        // The dark Sider otherwise falls back to AntD's hardcoded #001529,
        // which belongs to no palette and ignores theme changes.
        siderBg: palette.surface,
      },
    },
  };
}
