import { DEFAULT_UI_FONT } from "../themes/antd";
import { DEFAULT_TERM_FONT } from "../themes/xterm";

export interface FontFamilyOption {
  name: string;
  monospaced: boolean;
}

export const BUNDLED_FONT_OPTIONS: FontFamilyOption[] = [
  { name: DEFAULT_UI_FONT, monospaced: false },
  { name: DEFAULT_TERM_FONT, monospaced: true },
];

export function normalizeFontOptions(options: FontFamilyOption[]): FontFamilyOption[] {
  const byName = new Map<string, FontFamilyOption>();
  for (const option of options) {
    const name = option.name.trim();
    if (!name) continue;
    const existing = byName.get(name);
    byName.set(name, {
      name,
      monospaced: Boolean(existing?.monospaced || option.monospaced),
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function repairFontSelections(
  uiFont: string,
  termFont: string,
  options: FontFamilyOption[],
): { uiFont: string; termFont: string } {
  return {
    uiFont: options.some((option) => option.name === uiFont) ? uiFont : DEFAULT_UI_FONT,
    termFont: options.some(
      (option) => option.name === termFont && option.monospaced,
    )
      ? termFont
      : DEFAULT_TERM_FONT,
  };
}
