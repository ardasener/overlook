## Why

The terminal currently enables xterm transparency for every session, including fully opaque themes. This can force an unnecessary alpha compositing path and make WebGL text appear less crisp on light themes.

## What Changes

- Enable terminal transparency only when the configured background requires it.
- Preserve the existing WebGL renderer and wallpaper/translucency behavior.
- Add focused verification for opaque and translucent terminal modes.

## Capabilities

### New Capabilities

- `terminal-rendering`: Defines opaque versus translucent WebGL terminal rendering behavior.

### Modified Capabilities

None.

## Impact

Affected code: `src/modules/terminal/TerminalHost.tsx` and terminal rendering tests/configuration. No IPC, dependency, or backend changes.
