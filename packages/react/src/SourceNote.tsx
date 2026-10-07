import type { ReactNode } from "react";
import { Tag } from "./Chips";
import { VisuallyHidden } from "./LiveRegion";
import { useStoaFormat } from "./locale";

export type SourceNoteKind = "sim" | "official";

export type SourceNoteProps = {
  /** The source's short name, the same wherever it appears ("SIM", "Bank
   * of Russia"). Drawn in a tag and isolated in the direction of its own
   * first letter, so a Latin name keeps its order in an Arabic sentence. */
  tag: string;
  /** "sim" for synthetic or simulated figures, "official" for an outside
   * source. The kind colours the tag (the accent for "sim", the neutral
   * border for "official") and is set as `data-source`; the colour only
   * repeats what the tag and the sentence say, so the sentence names
   * synthetic figures as such ("Synthetic data: ..."). */
  kind: SourceNoteKind;
  /** The sentence beside the tag, in the page's language; links may be
   * part of it. */
  children: ReactNode;
  /** A link after the sentence, to the source or to the terms it is used
   * under. Its label is isolated in the direction of its own first letter
   * ("cbr.ru" in an Arabic sentence). */
  link?: { href: string; label: string };
};

/**
 * Where a widget's figures come from, at its top: a tag with the source's
 * short name, a sentence that says what the figures are, and an optional
 * link.
 *
 * Assistive technology reads "Source:" (in the locale) before the tag, so
 * "SIM" or "Bank of Russia" is heard as the name of a source rather than
 * as the first words of the sentence; the word is not drawn, as the tag's
 * frame says the same to the eye. The note is a paragraph, and wraps as
 * one: the tag stays at the start of the first line, and the sentence's
 * further lines start under it.
 */
export function SourceNote({ tag, kind, children, link }: SourceNoteProps) {
  const { messages } = useStoaFormat();
  return (
    <p className="stoa-source-note" data-source={kind}>
      <VisuallyHidden>{messages.sourceNoteLabel} </VisuallyHidden>
      <Tag size="small" tone={kind === "sim" ? "info" : "neutral"}>
        <bdi>{tag}</bdi>
      </Tag>{" "}
      <span className="stoa-source-note__text">
        {children}
        {link && (
          <>
            {" "}
            <a href={link.href} dir="auto">
              {link.label}
            </a>
          </>
        )}
      </span>
    </p>
  );
}
