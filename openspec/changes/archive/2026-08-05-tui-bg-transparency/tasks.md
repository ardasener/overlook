## 1. Settings model

- [x] 1.1 Add `remapBackground: boolean` and `stripBackground: boolean` to `Settings.background`; default `false`
- [x] 1.2 Validate/normalize both on load

## 2. Remap: theme-level mapping

- [x] 2.1 `xtermTheme(palette, translucent, remap)`: when `translucent && remap`, set `background` and `black` to `#00000000` (8-digit hex alpha)
- [x] 2.2 Thread the flag through `xtermOptions` and `TerminalHost`'s two call sites (initial + live appearance effect)

## 3. Strip: output-level filtering

- [x] 3.1 Add a `stripBackgroundCodes(chunk)` helper in `TerminalHost` (or pty.ts): remove `\x1b[40-47m`, `\x1b[100-107m`, `\x1b[48;5;Nm`, `\x1b[48;2;r;g;bm`, preserving all other bytes
- [x] 3.2 Apply it in the output handler before `terminal.write()` when `settings.background.image && settings.background.stripBackground`

## 4. Settings UI

- [x] 4.1 Add two `Switch` rows ("Remap background colors", "Strip background colors") in the Background image section, below the sliders
- [x] 4.2 Add `QuestionCircleOutlined` info icons with AntD `Tooltip` explanations for each
- [x] 4.3 Style the rows in `SettingsModal.css`

## 5. Verification

- [x] 5.1 `bun check-types` and `bun lint` pass
- [x] 5.2 Manual: with a wallpaper + opencode, remap alone → opencode's panel transparent if it uses the default bg; strip alone → opencode's truecolor panel transparent (highlight backgrounds gone); both off → solid as before; toggles independent; tooltips show explanations; no effect without a wallpaper
