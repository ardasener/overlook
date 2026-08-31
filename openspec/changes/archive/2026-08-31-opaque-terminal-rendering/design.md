## Context

`TerminalHost` currently passes `allowTransparency: true` to every xterm instance. Wallpaper-backed terminals need transparency, while ordinary themed terminals do not. The application must continue using xterm's WebGL addon and must not add DOM rendering as a product path.

## Goals / Non-Goals

**Goals:**

- Use an opaque WebGL rendering surface when no background image is configured.
- Retain transparency for wallpaper-backed terminals.
- Keep terminal behavior and IPC unchanged.

**Non-Goals:**

- Replacing xterm or its WebGL addon.
- Implementing a native font rasterizer.
- Changing fonts, palettes, or antialiasing policy.

## Decisions

Derive `allowTransparency` from the existing background-image setting at terminal creation time. This is preferable to always enabling alpha or introducing a second renderer, because it aligns the surface mode with the already-established wallpaper behavior and keeps the change local to terminal initialization.

The live appearance effect will continue updating theme and font settings only; changing wallpaper configuration remains a remount-level concern under the existing terminal lifecycle. The diagnostic comparison can therefore use separate application launches/builds rather than dynamically switching the WebGL surface mode.

## Risks / Trade-offs

- [Wallpaper state changes while a terminal is mounted] → Preserve the current mount-time behavior and verify normal wallpaper-backed sessions remain translucent.
- [Opaque WebGL rendering differs subtly across drivers] → Compare the new build with the previous build using identical font, size, and palette settings.
