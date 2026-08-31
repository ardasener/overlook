## Why

Transparent terminal backgrounds can make small text appear thinner and softer because the WebGL surface must be composited with wallpaper. Users should understand this rendering trade-off when enabling a background image.

## What Changes

- Add a warning to the Background image settings section when a wallpaper is configured.
- Explain that clearing the background provides the sharpest terminal text rendering.
- Do not add a separate crisp-text mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `terminal-rendering`: Document the user-facing warning for translucent terminal rendering.

## Impact

Affected code: appearance settings UI and terminal-rendering specification. No rendering, IPC, or dependency changes.
