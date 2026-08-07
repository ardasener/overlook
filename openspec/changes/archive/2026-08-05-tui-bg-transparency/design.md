## Context

With a wallpaper active, `xtermTheme(palette, translucent)` already sets the terminal background to `withAlpha(palette.bg, 0)` (8-digit hex alpha — the verified approach, since xterm's parser can't handle `rgba()`). TUI apps paint their own solid backgrounds over this (e.g. opencode's `#0a0a0a`), hiding the wallpaper. Settings are frontend-only in localStorage; the pty output flows Rust reader → Channel → `TerminalHost` output handler → `terminal.write()`.

## Goals / Non-Goals

**Goals:**
- Two independent, opt-in toggles restoring wallpaper visibility through TUI backgrounds.
- Explanation popovers for each option.
- Both only effective with a wallpaper; default off.

**Non-Goals:**
- Auto-detection of TUI transparency needs.
- Per-app rules.
- Stripping foreground colors.
- Any Rust-side changes.

## Decisions

### Remap: theme-level mapping
`xtermTheme(palette, translucent, remap)` maps `background` and `black` (ANSI color 0) to `#00000000` when `translucent && remap`. Applied live via the existing appearance effect.
- **Why**: apps that paint the default background (SGR reset / 49) pass through; explicit colored backgrounds (highlights) stay visible.
- **Note**: `black` mapping uses the same 8-digit-hex-alpha form xterm already parses.

### Strip: output-level filtering
In `TerminalHost`'s output handler, before `terminal.write()`, remove SGR background codes: `\x1b[40-47m`, `\x1b[100-107m`, `\x1b[48;5;Nm`, `\x1b[48;2;r;g;bm` (as byte/string regex). Foreground codes untouched.
- **Why**: catches every background fill including opencode's truecolor `#0a0a0a`; frontend-only (settings are already there).
- **Tradeoff**: also strips in-app highlight backgrounds — the explanatory popover says so.

### Both only effective with a wallpaper
The toggle flags are consulted only when `settings.background.image != null` (the `translucent` condition already threaded into `xtermTheme`; the strip filter checks the same flag).
- **Why**: without a wallpaper there's nothing to show through; avoids surprising behavior in normal mode.

### Settings model + UI
`background.remapBackground: boolean` and `background.stripBackground: boolean`, default `false`, validated on load. In the Appearance "Background image" section, below the sliders, two `Switch` rows: label + `QuestionCircleOutlined` info icon wrapped in an AntD `Tooltip` with the explanation.
- **Why**: groups the options with the wallpaper controls they affect; tooltips keep the labels short.

### Strip implementation detail
Apply the regex on the decoded string form of the output chunk before writing (xterm accepts both string and `Uint8Array`; converting to string for filtering then writing the filtered string keeps it simple).
- **Risk**: an ANSI sequence split across chunk boundaries could escape partial stripping. Chunks are typically large; acceptable for v1.

## Risks / Trade-offs

- [Strip removes highlight backgrounds] → documented in the popover; users choose between remap (safe) and strip (aggressive).
- [Chunk-boundary sequences under strip] → rare; v1 accepts partial-strip edge cases.
- [Remap's `black` change affects apps using ANSI black as a real color] → intended; the toggle is opt-in.
- [Both toggles no-op without wallpaper] → matches the feature's purpose; the tooltips mention it.

## Migration Plan

Frontend-only; `background.remapBackground`/`stripBackground` missing → defaults (`false`). Rollback: revert the theme param, the output filter, and the settings UI.
