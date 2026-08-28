import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PALETTE_ID, PALETTES, getPalette, type Palette } from "../themes/palettes";
import { applyPaletteVars } from "../themes/cssVars";
import {
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  DEFAULT_UI_FONT,
  type UiFontId,
} from "../themes/antd";
import { DEFAULT_TERM_FONT, TERM_SIZE_MAX, TERM_SIZE_MIN, type TermFontId } from "../themes/xterm";
import { invoke } from "@tauri-apps/api/core";
import {
  BUNDLED_FONT_OPTIONS,
  normalizeFontOptions,
  repairFontSelections,
  type FontFamilyOption,
} from "./fonts";
import type { ActionId, Keybinding } from "../shortcuts/keybindings";
import { DEFAULT_KEYBINDINGS } from "../shortcuts/keybindings";

export { UI_SCALE_DEFAULT, UI_SCALE_MIN, UI_SCALE_MAX, UI_SCALE_STEP };

export { TERM_SIZE_MIN, TERM_SIZE_MAX };

/** Where software window controls sit in the tab bar (non-macOS only). */
export type WindowControlsPosition = "left" | "right";

const WINDOW_CONTROLS_POSITIONS: WindowControlsPosition[] = ["left", "right"];

/** A configurable runnable app: a name plus one command per spawned tab. */
export interface Runnable {
  id: string;
  name: string;
  /** Each entry is a command string, whitespace-split into argv at launch. */
  commands: string[];
}

export interface Settings {
  themeId: string;
  uiFont: UiFontId;
  uiScale: number;
  termFont: TermFontId;
  termSize: number;
  runnables: Runnable[];
  /** Edge of the tab bar hosting the software window controls (non-macOS). */
  windowControlsPosition: WindowControlsPosition;
  /** Per-action keyboard shortcuts (primary + optional alternative). */
  keybindings: Record<ActionId, Keybinding>;
  /** Full-window background image (stored filename + blur/opacity). */
  background: {
    image: string | null;
    blur: number;
    opacity: number;
    /** Remap the terminal's default/ANSI-black background to transparent so
     *  TUIs using the default background let the wallpaper show through. */
    remapBackground: boolean;
    /** Strip background color SGR codes from app output (aggressive — also
     *  removes in-app highlight backgrounds). */
    stripBackground: boolean;
  };
}

export const BACKGROUND_BLUR_MAX = 60;
export const BACKGROUND_OPACITY_MIN = 0.05;
export const BACKGROUND_OPACITY_MAX = 1;

export function clampBlur(value: number): number {
  return Math.min(BACKGROUND_BLUR_MAX, Math.max(0, Math.round(value)));
}

export function clampOpacity(value: number): number {
  return Math.min(BACKGROUND_OPACITY_MAX, Math.max(BACKGROUND_OPACITY_MIN, value));
}

/** Seed runnables for a fresh install. User-editable like any other entry. */
const DEFAULT_RUNNABLES: Runnable[] = [
  { id: "runnable-ai", name: "AI", commands: ["opencode"] },
  { id: "runnable-editor", name: "Editor", commands: ["micro"] },
  { id: "runnable-monitor", name: "Monitor", commands: ["btop"] },
  { id: "runnable-dev", name: "Dev", commands: ["opencode", "micro", "btop"] },
];

const DEFAULTS: Settings = {
  themeId: DEFAULT_PALETTE_ID,
  uiFont: DEFAULT_UI_FONT,
  uiScale: UI_SCALE_DEFAULT,
  termFont: DEFAULT_TERM_FONT,
  termSize: 13,
  runnables: DEFAULT_RUNNABLES,
  windowControlsPosition: "right",
  keybindings: DEFAULT_KEYBINDINGS,
  background: { image: null, blur: 20, opacity: 0.5, remapBackground: false, stripBackground: false },
};

const STORAGE_KEY = "overlook-settings";

function clampSize(value: number): number {
  return Math.min(TERM_SIZE_MAX, Math.max(TERM_SIZE_MIN, Math.round(value)));
}

function normalizeScale(value: number): number {
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, value));
  return Math.round(clamped / UI_SCALE_STEP) * UI_SCALE_STEP;
}

/** Snap an arbitrary number to the nearest valid UI scale step. */
export function snapUiScale(value: number): number {
  return normalizeScale(value);
}

function normalizeFont(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      themeId: PALETTES.some((p) => p.id === parsed.themeId)
        ? parsed.themeId!
        : DEFAULTS.themeId,
      uiFont: normalizeFont(parsed.uiFont, DEFAULTS.uiFont),
      uiScale:
        typeof parsed.uiScale === "number" && Number.isFinite(parsed.uiScale)
          ? normalizeScale(parsed.uiScale)
          : DEFAULTS.uiScale,
      termFont: normalizeFont(parsed.termFont, DEFAULTS.termFont),
      termSize:
        typeof parsed.termSize === "number" && Number.isFinite(parsed.termSize)
          ? clampSize(parsed.termSize)
          : DEFAULTS.termSize,
      runnables:
        Array.isArray(parsed.runnables) && parsed.runnables.length > 0
          ? parsed.runnables.filter(
              (r) =>
                r &&
                typeof r.id === "string" &&
                typeof r.name === "string" &&
                Array.isArray(r.commands) &&
                r.commands.every((c) => typeof c === "string"),
            )
          : DEFAULT_RUNNABLES,
      windowControlsPosition: WINDOW_CONTROLS_POSITIONS.includes(
        parsed.windowControlsPosition as WindowControlsPosition,
      )
        ? (parsed.windowControlsPosition as WindowControlsPosition)
        : DEFAULTS.windowControlsPosition,
      keybindings: normalizeKeybindings(parsed.keybindings),
      background: {
        image:
          parsed.background && typeof parsed.background.image === "string"
            ? parsed.background.image
            : DEFAULTS.background.image,
        blur:
          parsed.background && typeof parsed.background.blur === "number"
            ? clampBlur(parsed.background.blur)
            : DEFAULTS.background.blur,
        opacity:
          parsed.background && typeof parsed.background.opacity === "number"
            ? clampOpacity(parsed.background.opacity)
            : DEFAULTS.background.opacity,
        remapBackground:
          parsed.background && typeof parsed.background.remapBackground === "boolean"
            ? parsed.background.remapBackground
            : DEFAULTS.background.remapBackground,
        stripBackground:
          parsed.background && typeof parsed.background.stripBackground === "boolean"
            ? parsed.background.stripBackground
            : DEFAULTS.background.stripBackground,
      },
    };
  } catch {
    return DEFAULTS;
  }
}

/** Merge stored keybindings over the defaults, keeping only valid combos. */
function normalizeKeybindings(
  stored: Partial<Record<ActionId, Keybinding>> | undefined,
): Record<ActionId, Keybinding> {
  const out: Record<ActionId, Keybinding> = { ...DEFAULT_KEYBINDINGS };
  if (!stored || typeof stored !== "object") return out;
  for (const action of Object.keys(DEFAULT_KEYBINDINGS) as ActionId[]) {
    const k = stored[action];
    if (!k || typeof k.primary !== "string") continue;
    out[action] = {
      primary: k.primary,
      alt: typeof k.alt === "string" ? k.alt : null,
    };
  }
  return out;
}

export { loadSettings };

interface SettingsContextValue {
  settings: Settings;
  palette: Palette;
  update: (patch: Partial<Settings>) => void;
  fonts: FontFamilyOption[];
  fontsLoading: boolean;
  refreshFonts: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [fonts, setFonts] = useState<FontFamilyOption[]>(BUNDLED_FONT_OPTIONS);
  const [fontsLoading, setFontsLoading] = useState(false);

  const refreshFonts = useCallback(async () => {
    setFontsLoading(true);
    try {
      const discovered = await invoke<FontFamilyOption[]>("font_list");
      const nextFonts = normalizeFontOptions([...BUNDLED_FONT_OPTIONS, ...discovered]);
      setFonts(nextFonts);
      setSettings((prev) => ({
        ...prev,
        ...repairFontSelections(prev.uiFont, prev.termFont, nextFonts),
      }));
    } catch {
      setFonts(BUNDLED_FONT_OPTIONS);
      setSettings((prev) => ({
        ...prev,
        uiFont: DEFAULT_UI_FONT,
        termFont: DEFAULT_TERM_FONT,
      }));
    } finally {
      setFontsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFonts();
  }, [refreshFonts]);

  // Keep the palette CSS variables on the document root so the whole page
  // (including portals) inherits theme colors, matching the window edges.
  useEffect(() => {
    applyPaletteVars(document.documentElement, getPalette(settings.themeId), settings.uiScale);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      palette: getPalette(settings.themeId),
      update: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      fonts,
      fontsLoading,
      refreshFonts,
    }),
    [fonts, fontsLoading, refreshFonts, settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
