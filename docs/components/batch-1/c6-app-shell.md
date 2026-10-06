# C6: AppHeader, PageShell, VisuallyHidden, LiveRegion

Why: both demos duplicate the same header bar CSS; Themis ships its own
`.visually-hidden` and live region although Stoa has an internal class.

Build:
- `PageShell`: header slot, main region (`<main>` with a skip link
  target), optional footer; content width and gutters from tokens;
- `AppHeader`: title (product name), optional context (for example a
  symbol or a lesson), and a trailing actions slot; one `<header>`
  landmark; a skip link to main content;
- `VisuallyHidden`: exported component over the existing class;
- `LiveRegion`: polite or assertive, with a debounce so fast updates do
  not flood screen readers.

Tests: landmarks and skip link, live region announcements (text updated,
debounced), RTL layout of the header.
