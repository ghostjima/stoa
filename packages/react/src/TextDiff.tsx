import { useId, useMemo } from "react";
import { Disclosure } from "./Disclosure";
import { stoaFormatters } from "./format";
import { VisuallyHidden } from "./LiveRegion";
import { diffStats, diffWords, type DiffPart, type DiffStats } from "./diff";
import { useStoaFormat, type StoaFormat } from "./locale";

export type TextDiffProps = {
  /** Names the comparison ("Draft against the signed reply"): its
   * caption. */
  label: string;
  /** Keep the label for assistive technology only, under a visible
   * heading. */
  hideLabel?: boolean;
  /** The first text: the draft. */
  before: string;
  /** The second text: the version it became (the signed one). */
  after: string;
  /** The texts' language ("ru"), when it is not the page's. */
  lang?: string;
  /** Show the list of changes open on first render; the person opens and
   * closes it after that. */
  changesOpen?: boolean;
};

/** One change of the list: a deletion, an insertion, or a deletion
 * followed by its insertion (a replacement). */
export type DiffChange = { kind: "replaced" | "deleted" | "inserted"; deleted: string; inserted: string };

/** The changes of a diff, in order, a deletion and the insertion right
 * after it taken as one replacement. */
export function diffChanges(parts: DiffPart[]): DiffChange[] {
  const changes: DiffChange[] = [];
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k]!;
    if (part.kind === "equal") continue;
    const next = parts[k + 1];
    if (part.kind === "deleted" && next?.kind === "inserted") {
      changes.push({ kind: "replaced", deleted: part.text, inserted: next.text });
      k++;
    } else if (part.kind === "deleted") changes.push({ kind: "deleted", deleted: part.text, inserted: "" });
    else changes.push({ kind: "inserted", deleted: "", inserted: part.text });
  }
  return changes;
}

/** The share of changed characters as a percent with one decimal, in the
 * locale. A share above zero never shows as 0.0%, and one below one never
 * shows as 100.0%: a change of one character in a long letter is still
 * a change, and a letter that kept one character was not rewritten
 * whole. */
export function changedPercent(stats: DiffStats, locale: string): string {
  const { changed } = stats;
  const shown = changed === 0 || changed === 1 ? changed : Math.min(Math.max(Math.round(changed * 1000) / 1000, 0.001), 0.999);
  return stoaFormatters(locale).percent(shown, 1);
}

/** The summary sentence: how many characters changed, as a share and as
 * counts. */
export function diffSummary(stats: DiffStats, format: StoaFormat): string {
  if (stats.deleted + stats.inserted === 0) return format.messages.diffNone;
  return format.messages.diffSummary(
    changedPercent(stats, format.locale),
    format.integer(stats.deleted),
    format.integer(stats.inserted),
    format.integer(stats.total),
  );
}

/** A deletion or an insertion: struck through or underlined, on its fill,
 * and read with words at its start and its end. */
function Mark({ kind, text, lang }: { kind: "deleted" | "inserted"; text: string; lang?: string }) {
  const { messages } = useStoaFormat();
  const Tag = kind === "deleted" ? "del" : "ins";
  const blank = text.trim() === "";
  return (
    <Tag className={`stoa-diff__mark stoa-diff__mark--${kind}${blank ? " stoa-diff__mark--blank" : ""}`}>
      <VisuallyHidden>{`${kind === "deleted" ? messages.diffDeleted : messages.diffInserted} `}</VisuallyHidden>
      <span lang={lang}>{text}</span>
      {blank && <VisuallyHidden>{messages.diffWhitespace}</VisuallyHidden>}
      <VisuallyHidden>{` ${kind === "deleted" ? messages.diffDeletedEnd : messages.diffInsertedEnd}`}</VisuallyHidden>
    </Tag>
  );
}

/**
 * Two versions of a text, word by word: the second text with what was
 * deleted from the first struck through (`del`) and what was inserted
 * underlined (`ins`), each on its own fill and read with words at its
 * start and end ("deleted: ... end of deletion"), so a change is never
 * told by colour alone. Above it, a summary: the share of changed
 * characters, which is (deleted + inserted) / (characters of the first
 * text + characters of the second), counting every Unicode code point,
 * spaces included, with the counts behind it. Under it, the same changes
 * as a list, one item per deletion, insertion or replacement.
 *
 * The diff is computed here, the same for any script (diffWords): runs of
 * letters and digits, runs of whitespace and single punctuation marks are
 * compared as tokens, and their longest common subsequence is kept.
 */
export function TextDiff({ label, hideLabel = false, before, after, lang, changesOpen = false }: TextDiffProps) {
  const format = useStoaFormat();
  const { messages, integer } = format;
  const captionId = useId();
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  const stats = diffStats(parts);
  const changes = diffChanges(parts);
  return (
    <figure className="stoa-diff" aria-labelledby={captionId}>
      <figcaption id={captionId} className={hideLabel ? "stoa-visually-hidden" : "stoa-diff__label"}>
        {label}
      </figcaption>
      <p className="stoa-diff__summary">{diffSummary(stats, format)}</p>
      <div className="stoa-diff__text" dir="auto">
        {parts.map((part, k) =>
          part.kind === "equal" ? (
            <span key={k} lang={lang}>
              {part.text}
            </span>
          ) : (
            <Mark key={k} kind={part.kind} text={part.text} lang={lang} />
          ),
        )}
      </div>
      {changes.length > 0 && (
        <Disclosure className="stoa-diff__changes" summary={messages.diffChanges(integer(changes.length))} defaultOpen={changesOpen}>
          <ol className="stoa-diff__list">
            {changes.map((change, k) => (
              <li key={k} className="stoa-diff__change">
                <span className="stoa-diff__kind">{messages.diffKind[change.kind]}</span>
                <span className="stoa-diff__pair" dir="auto">
                  {change.deleted && <Mark kind="deleted" text={change.deleted} lang={lang} />}
                  {change.deleted && change.inserted && " "}
                  {change.inserted && <Mark kind="inserted" text={change.inserted} lang={lang} />}
                </span>
              </li>
            ))}
          </ol>
        </Disclosure>
      )}
    </figure>
  );
}
