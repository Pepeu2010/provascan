# ProvaScan visual system

## Direction

ProvaScan is a focused workspace for teachers who prepare, correct and understand assessments. The interface uses an editorial-operational language: quiet navigation, high-contrast working surfaces and one cobalt action color. It deliberately avoids glassmorphism, neon and decorative dashboard widgets.

## References used

- Linear: navigation recedes so the active workspace carries attention; dense information keeps clear hierarchy.
- GitHub Primer: semantic tokens, separate light and dark color modes, and accessibility built into primitives.
- Notion Calendar: restrained controls and task-first navigation.

The patterns were adapted for assessment correction. No brand, layout or decorative treatment was copied.

## Tokens

- Accent: cobalt (`--accent`). Semantic states are success, warning and error only.
- Surfaces: canvas, surface, raised surface and overlay.
- Type: Manrope for interface text and IBM Plex Mono only for identifiers and metrics.
- Space: 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64px.
- Radius: 8px controls, 12px panels, 16px prominent containers, full only for status pills.
- Motion: 140ms fast, 200ms normal, 280ms emphasized. Motion explains feedback; reduced-motion disables it.

## Theme behavior

The saved preference is respected, defaults to the operating-system preference and is applied before hydration to avoid a visible theme flash. Light and dark modes share the same cobalt identity but use different surface, border and elevation values.
