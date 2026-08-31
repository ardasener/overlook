## Context

Wallpaper mode intentionally enables a transparent WebGL terminal surface. This preserves the wallpaper inside the terminal but can reduce small-text crispness compared with the opaque mode.

## Goals / Non-Goals

**Goals:**

- Make the rendering trade-off visible at the point where users enable/configure wallpaper.
- Recommend clearing the wallpaper for the sharpest terminal text.

**Non-Goals:**

- Adding a crisp-text toggle.
- Changing WebGL rendering or transparency behavior.

## Decisions

Show an inline warning only while a background image is configured, directly below the background controls. Use existing settings styling and an informational visual treatment rather than a modal or blocking alert.

## Risks / Trade-offs

- [Warning adds visual noise] → Show it only when wallpaper is active and keep the copy concise.
- [Users misread the warning as an error] → Use informational styling and explain the cause as a trade-off.
