# Test fonts for the font engine

Two small subsets of open fonts, committed so that the engine's tests
measure real shaping rather than a hand-written table. Both are licensed
under the SIL Open Font License 1.1, which permits subsetting and
redistribution; neither upstream family declares a Reserved Font Name, and
the copyright and licence records of each file are kept as they were. The
licence text of each is beside it.

| File | Subset of | Licence | Why it is here |
|---|---|---|---|
| `Inter-digits-subset.ttf` | Inter Variable 4.001, from `inter-ui@4.1.1` (`variable/InterVariable.woff2`) | `Inter-OFL.txt` | A variable TTF: two axes with named instances, features the font names itself, and Latin digits that are proportional until `tnum` is asked for. Its Arabic-Indic digits are absent, which is what the glyph-0 assertion is tested against. |
| `NotoSansArabic-digits-subset.woff2` | Noto Sans Arabic 2.013, from `notofonts.github.io` (`fonts/NotoSansArabic/unhinted/ttf/NotoSansArabic-Regular.ttf`) | `NotoSansArabic-OFL.txt` | A WOFF2, so the decode path is exercised before anything is measured, with tabular Arabic-Indic digits and no Latin digits. |

Both were made with `fonttools` 4.66.0 (`pyftsubset`). The Inter source was
brought to an sfnt first, because `pyftsubset` keeps the flavour of its
input and a file named `.ttf` that is still WOFF2 would test the wrong
path:

```
python -c "from fontTools.ttLib import TTFont; f=TTFont('InterVariable.woff2'); f.flavor=None; f.save('InterVariable.ttf')"

pyftsubset InterVariable.ttf \
  --unicodes="U+0020,U+0030-0039" \
  --layout-features="tnum,pnum,zero,ss01,ss02,cv01,cv09,calt,ccmp" \
  --name-IDs='*' --name-legacy --notdef-outline --glyph-names \
  --output-file=Inter-digits-subset.ttf

pyftsubset NotoSansArabic-Regular.ttf \
  --unicodes="U+0020,U+0660-0669" \
  --layout-features="tnum,pnum,ccmp,locl" \
  --name-IDs='*' --name-legacy --notdef-outline --glyph-names --flavor=woff2 \
  --output-file=NotoSansArabic-digits-subset.woff2
```

`--name-IDs='*'` keeps the name table whole, which is what the feature UI
names, the named instances and the licence records are read from.
`--glyph-names` keeps the `post` table names, so a feature's effect is
reported as `zero to zero.slash` rather than `gid1 to gid11`.

The numbers the tests assert are the ones `engine.ts` reports for these
exact files. Replacing a file means re-measuring, not adjusting an
expectation: see `../../../docs/type-measurements.md`.
