import type { ReactNode } from "react";

export type LtrProps = {
  children: ReactNode;
  /** In the numeric face (Plex Mono, tabular figures): code, an
   * identifier, a ticker. Off by default: a formula or a range in a
   * sentence keeps the sentence's face. */
  mono?: boolean;
  /** The run's language, when it is not the page's ("en" for a Latin
   * ticker in an Arabic sentence). */
  lang?: string;
};

/** A run that always reads left to right, isolated from the text around
 * it (`bdi dir="ltr"`): code, a ticker, an identifier, a formula. In a
 * right-to-left sentence it stays one piece in its own order ("2 + 2 = 4"
 * does not become "4 = 2 + 2"), and its signs and spaces do not join the
 * sentence. For a value whose direction is not known in advance (a name,
 * an amount with a unit in either script) use HTML's own `bdi`, which
 * takes the direction of its first letter; Stoa's components isolate the
 * values they draw that way. */
export function Ltr({ children, mono = false, lang }: LtrProps) {
  return (
    <bdi dir="ltr" lang={lang} className={mono ? "stoa-ltr stoa-ltr--mono" : "stoa-ltr"}>
      {children}
    </bdi>
  );
}
