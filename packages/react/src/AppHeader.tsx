import type { ReactNode } from "react";

export type AppHeaderProps = {
  /** The application's name: the page's only first-level heading. */
  title: ReactNode;
  /** A short line beside the title: what the application does, or what it
   * shows now ("AAPL on IEX"). */
  subtitle?: ReactNode;
  /** Small print at the end of the bar, before the actions: a data source,
   * an attribution, terms. */
  note?: ReactNode;
  /** Controls at the end of the bar, for example the theme and language
   * switches (ChoiceGroup, size "small"). */
  actions?: ReactNode;
};

/** The bar at the top of an application: its name and subtitle at the
 * start, a note and the actions at the end. It is the page's banner
 * landmark, wraps on a narrow screen, and uses logical properties only,
 * so it mirrors in a right-to-left page without overrides. */
export function AppHeader({ title, subtitle, note, actions }: AppHeaderProps) {
  return (
    <header className="stoa-app-header">
      <h1 className="stoa-app-header__title">{title}</h1>
      {subtitle && <span className="stoa-app-header__subtitle">{subtitle}</span>}
      <span className="stoa-app-header__spacer" />
      {note && <span className="stoa-app-header__note">{note}</span>}
      {actions && <div className="stoa-app-header__actions">{actions}</div>}
    </header>
  );
}
