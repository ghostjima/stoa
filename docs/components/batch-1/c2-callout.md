# C2: Callout

Why: both demos show errors as a bare paragraph without a retry, Tyche's
data-provider notice and Themis's note on maths are ad-hoc text.

Build `Callout`:
- tones: info, positive, warning, negative (the existing status tokens);
  tone is carried by an icon or symbol and a word as well as colour;
- title (optional), body, optional action slot (for example a Retry
  Button);
- role: `alert` only for negative callouts that appear after an action
  (prop to choose `status` or `alert`); none for static notes;
- dismissible variant with a close button that has an accessible name.

Out of scope: toasts, banners pinned to the page edge.
