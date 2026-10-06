# Type measurements

Everything here was measured with the font engine in
`apps/playground/src/type/`, at commit
`0577dcf7fd9be752abd61e3f8e7b9423dabd57e4`, with HarfBuzz 14.5.0 as
`harfbuzzjs@1.6.2` reports it. The tables were produced by

```
node apps/playground/scripts/font-report.mjs "<label>=<path to the file>" ...
```

The files are named with their versions and the first 16 hex digits of
their sha256, because a font family is not one file: a full release and a
web subset of the same family answer differently, and both call themselves
the same name.

Brief 07 states its context as measured elsewhere and asks for it to be
re-verified. The re-verification is below, including the two places where
this project's measurements do not agree with the brief.

## Files

| Label | File | Family (name ID 1) | Container | sha256 (first 16) | upem | x-height | GSUB tags |
|---|---|---|---|---:|---:|---:|---:|
| IBM Plex Sans, full release | `@ibm/plex-sans@1.1.0` `fonts/complete/woff2/IBMPlexSans-Regular.woff2` | IBM Plex Sans | woff2 | `ba711a3085ff9f27` | 1000 | 516 | 21 |
| IBM Plex Sans, Fontsource latin subset | `@fontsource/ibm-plex-sans@5.3.0` `files/ibm-plex-sans-latin-400-normal.woff2` | IBM Plex Sans | woff2 | `3b646991d30055a9` | 1000 | 516 | 5 |
| IBM Plex Sans Arabic, full release | `@ibm/plex-sans-arabic@1.1.0` `fonts/complete/woff2/IBMPlexSansArabic-Regular.woff2` | IBM Plex Sans Arabic | woff2 | `74112e1b7bf2e2c5` | 1000 | 516 | 25 |
| IBM Plex Sans Arabic, Fontsource arabic subset | `@fontsource/ibm-plex-sans-arabic@5.3.0` `files/ibm-plex-sans-arabic-arabic-400-normal.woff2` | IBM Plex Sans Arabic | woff2 | `6010e7fd0dce5d52` | 1000 | 516 | 7 |
| Noto Sans Arabic, full release | `notofonts.github.io` `fonts/NotoSansArabic/unhinted/ttf/NotoSansArabic-Regular.ttf`, version 2.013 | Noto Sans Arabic | ttf | `bd86ca02f087d7f3` | 1000 | 536 | 12 |
| Noto Sans Arabic, Fontsource arabic subset | `@fontsource/noto-sans-arabic@5.3.0` `files/noto-sans-arabic-arabic-400-normal.woff2` | Noto Sans Arabic | woff2 | `4e2ca0745c908761` | 1000 | 536 | 9 |
| Inter, full variable release | `inter-ui@4.1.1` `variable/InterVariable.woff2`, version 4.001 | Inter Variable | woff2 | `693b77d4f32ee9b8` | 2048 | 1118 | 39 |
| Inter, Fontsource latin subset | `@fontsource/inter@5.3.0` `files/inter-latin-400-normal.woff2` | Inter | woff2 | `8909904ab6c872eb` | 2048 | 1118 | 8 |
| IBM Plex Mono, Fontsource latin subset | `@fontsource/ibm-plex-mono@5.3.0` `files/ibm-plex-mono-latin-400-normal.woff2` | IBM Plex Mono | woff2 | `08949f728dc52d52` | 1000 | 516 | 4 |
| Inter digits subset | committed, `src/type/testdata/Inter-digits-subset.ttf` | Inter Variable | ttf | `1eed6cb9fa9ffe73` | 2048 | 1118 | 7 |
| Noto Sans Arabic digits subset | committed, `src/type/testdata/NotoSansArabic-digits-subset.woff2` | Noto Sans Arabic | woff2 | `b4ebe5ce4ee72af4` | 1000 | 536 | 2 |

The three families the brief asks for are the first six rows; the rest are
here because the panel offers them (Plex Mono is a role default) or because
the engine's tests assert them.

## Digit advances

In font units, each digit shaped on its own, zero first. A set in which at
least one digit shaped to glyph id 0 is reported as absent: the file does
not contain it, and the .notdef advances mean nothing.

| File | Set | Asked for | Verdict | Distinct | Advances |
|---|---|---|---|---:|---|
| IBM Plex Sans, full release | Latin | as shaped | tabular | 1 | 600 x 10 |
| IBM Plex Sans, full release | Latin | `tnum 1` | tabular | 1 | 600 x 10 |
| IBM Plex Sans, full release | Arabic-Indic | either | absent | n/a | not in this file |
| IBM Plex Sans, Fontsource latin subset | Latin | either | tabular | 1 | 600 x 10 |
| IBM Plex Sans, Fontsource latin subset | Arabic-Indic | either | absent | n/a | not in this file |
| IBM Plex Sans Arabic, full release | Latin | either | tabular | 1 | 600 x 10 |
| IBM Plex Sans Arabic, full release | Arabic-Indic | as shaped | proportional | 9 | 282, 263, 485, 630, 486, 526, 503, 531, 531, 508 |
| IBM Plex Sans Arabic, full release | Arabic-Indic | `tnum 1` | proportional | 9 | 282, 263, 485, 630, 486, 526, 503, 531, 531, 508 |
| IBM Plex Sans Arabic, Fontsource arabic subset | Latin | either | absent | n/a | not in this file |
| IBM Plex Sans Arabic, Fontsource arabic subset | Arabic-Indic | as shaped | proportional | 9 | 282, 263, 485, 630, 486, 526, 503, 531, 531, 508 |
| IBM Plex Sans Arabic, Fontsource arabic subset | Arabic-Indic | `tnum 1` | proportional | 9 | 282, 263, 485, 630, 486, 526, 503, 531, 531, 508 |
| Noto Sans Arabic, full release | Latin | either | tabular | 1 | 572 x 10 |
| Noto Sans Arabic, full release | Arabic-Indic | either | tabular | 1 | 572 x 10 |
| Noto Sans Arabic, Fontsource arabic subset | Latin | either | absent | n/a | not in this file |
| Noto Sans Arabic, Fontsource arabic subset | Arabic-Indic | either | tabular | 1 | 572 x 10 |
| Inter, full variable release | Latin | as shaped | proportional | 9 | 1292, 833, 1249, 1265, 1323, 1215, 1270, 1159, 1267, 1270 |
| Inter, full variable release | Latin | `tnum 1` | tabular | 1 | 1328 x 10 |
| Inter, Fontsource latin subset | Latin | as shaped | proportional | 9 | 1292, 833, 1249, 1265, 1323, 1215, 1270, 1159, 1267, 1270 |
| Inter, Fontsource latin subset | Latin | `tnum 1` | tabular | 1 | 1328 x 10 |
| IBM Plex Mono, Fontsource latin subset | Latin | either | tabular | 1 | 600 x 10 |

What the brief states, and what this says:

- IBM Plex Sans Arabic has proportional Arabic-Indic digits and `tnum` does
  not make them tabular. Confirmed, in the full release and in the
  Fontsource subset alike, with the same ten advances.
- Noto Sans Arabic is tabular. Confirmed, 572 units for every Arabic-Indic
  digit and for every Latin digit in the full release.
- The brief gives the Plex Sans Arabic range as "10 distinct advances, 263
  to 630 units". The range is the same. The count here is **nine**, not
  ten: two digits share an advance of 531 when each digit is shaped on its
  own. Shaped as one run the ten advances, zero first, are 282, 263, 485,
  630, 486, 526, 503, 481, 531, 508, which is ten distinct values, because
  a contextual alternate gives U+0667 a 481-unit form among other digits
  and a 531-unit form on its own. Both are reported: the verdict is about
  the glyphs' own advances, and the run is recorded beside it. The run was
  re-measured at commit `139b3143afc548b08e6cce8501fa5662ecf0f0aa`, in the
  full release and in the Fontsource subset, after the engine began putting
  a right-to-left run back in logical order; HarfBuzz returns it in visual
  order, and the earlier reading listed it back to front.

## Why the advances are measured per glyph

Shaping the ten digits as one run mixes pair kerning into the advances. In
Inter 4.001 the seven before the eight is kerned by -29 units, so the run
reads 1130 where the glyph's own advance is 1159. A tabular font that kerns
its digits would come out of a run measurement looking proportional, and a
proportional set can come out of a run looking narrower than it is. The
engine therefore shapes each digit alone for the verdict and records the run
next to it, and says so when the two disagree.

| File | Set | Glyphs' own advances | The same ten as one run |
|---|---|---|---|
| Inter, full variable release | Latin, as shaped | ..., 1270, **1159**, 1267, 1270 | ..., 1270, **1130**, 1267, 1270 |
| IBM Plex Sans Arabic, full release | Arabic-Indic, either | 282, 263, 485, 630, 486, 526, 503, **531**, 531, 508 | 282, 263, 485, 630, 486, 526, 503, **481**, 531, 508 |

## Features kept by a web subset

| Family | Full release | Fontsource subset | Dropped |
|---|---:|---:|---|
| Inter | 39 | 8 | `aalt case cv01`..`cv14 dlig ordn salt sinf ss01`..`ss08 subs sups zero` |
| IBM Plex Sans | 21 | 5 | `aalt lnum locl onum ordn salt sinf ss01`..`ss06 subs sups zero` |
| IBM Plex Sans Arabic | 25 | 7 | `aalt dlig dnom frac liga numr ordn salt sinf ss01`..`ss06 subs sups zero` |
| Noto Sans Arabic | 12 | 9 | `aalt dlig rtlm` |

The brief's Inter figures are confirmed exactly: the Fontsource latin subset
keeps eight distinct GSUB tags (`calt ccmp dnom frac locl numr pnum tnum`)
and the full variable release has 39. The inspector states this as "8 of
39" for the families in this table, which are the ones the engine carries
counts for; for anything else it lists what the loaded file has and says
that the full release has not been measured here.

The Fontsource builds of IBM Plex also drop the licence description (name
ID 13) and keep the licence URL (name ID 14), so the panel reports "the
file states no licence text, only a licence URL" rather than claiming a
licence the file does not state.

## Canvas numerics

Measured by the panel itself, in the browser, at a 400px probe size, with
the committed Inter digits subset as the numeric role's face:

- Browser: `HeadlessChrome/141.0.7390.37` (the Chromium of
  `@playwright/test@1.56.1`), on Linux.
- The face as loaded: not tabular, 9 distinct advances
  (245, 145, 224, 239, 247, 231, 234, 206, 233, 234 CSS pixels).
- The same file registered as a `FontFace` with
  `featureSettings: "tnum" 1, "zero" 1`: tabular, one advance (258 CSS
  pixels for all ten). So the descriptor reaches canvas in this browser.
- `font-feature-settings` set on the canvas element itself: also tabular,
  one advance. This does not match the brief, which states that canvas
  cannot take `font-feature-settings`; in Chromium 141 the canvas element's
  own computed value does apply to `measureText` and to what is drawn, and
  removing it restores the proportional advances. It is not the route the
  panel relies on, because it depends on the canvas having an element and a
  computed style at all, which an `OffscreenCanvas` does not.
- Ladder's own font shorthand, built by `readCanvasTokens` from the frame's
  variables, with the frames' mono variable pointed at that face:
  `13px StoaLoadedInterVariable..., system-ui, sans-serif`, not tabular,
  3 distinct advances. Nine distinct advances in font units collapse to
  three at 13px, the regular density's font size, and three is still
  a column that does not line up.

Only one engine was measured. The panel reports the browser it ran in and
what that browser did, so the answer for another engine is whatever the
panel says there, not what is written here.

## Two findings about the worker

- HarfBuzz initialises its WASM with a top-level await. In a module worker
  whose graph contains one, a handler installed by assigning
  `self.onmessage` after that await never receives anything in Chromium 141:
  the worker evaluates, the main thread posts, and nothing arrives. A
  listener added with `self.addEventListener("message", ...)` receives every
  message. The worker uses `addEventListener` for that reason.
- `wawoff2@2.0.1`, which the brief names for the WOFF2 decode, decides what
  it is running in with `typeof importScripts === "function"`. A module
  worker has no `importScripts`, so the Emscripten module never finishes
  starting: its exports stay empty, `calledRun` never becomes true, and
  every decode waits for ever. Defining `importScripts` before the import
  does not help. The decoder here is `woff2-encoder@2.0.0` (MIT), which
  carries its WASM as a data URI and has no such branch; it decodes in a
  module worker, on the main thread and in Node, and the engine's tests
  cover the decode in Node.
