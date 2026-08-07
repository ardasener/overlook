## Why

With a wallpaper active, the terminal interior is transparent — but TUI apps like opencode paint their own UI with a solid background (opencode's default theme uses `#0a0a0a`), hiding the wallpaper. Two independent mechanisms can restore transparency, each with different side effects, so users should choose which (if any) to enable.

## What Changes

- Two independent settings toggles in the "Background image" section of Appearance settings:
  - **Remap background colors**: maps the terminal's default/ANSI-black background to transparent at the theme level, so apps using the *default* background let the wallpaper through while explicit text highlights still render.
  - **Strip background colors**: removes background color SGR codes from app output, forcing every background transparent — more aggressive, also removes in-app highlight backgrounds.
- Both only take effect when a wallpaper is set. Both default to off.
- Each toggle has an info icon with an explanation popover.

## Capabilities

### Modified Capabilities
- `background-wallpaper`: gains the two transparency toggles and their explanations.

### New Capabilities
<!-- None: behavior extends the existing background-wallpaper capability. -->

## Impact

- `src/settings/SettingsContext.tsx`: `background.remapBackground` + `background.stripBackground` (default `false`), validation, persistence.
- `src/themes/xterm.ts`: `xtermTheme` maps default/black to transparent when remap is on (8-digit hex alpha approach).
- `src/modules/terminal/TerminalHost.tsx`: output handler strips background SGR codes when strip is on.
- `src/components/settings/SettingsModal.tsx` + CSS: two `Switch` rows with `QuestionCircleOutlined` tooltips in the Background image section.
- No Rust changes (strip is applied in the frontend write path; remap is theme-level).
