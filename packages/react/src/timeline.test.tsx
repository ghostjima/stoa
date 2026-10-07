// @vitest-environment jsdom
// Timeline: entries sorted by their machine date, oldest first, grouped
// by day in the given time zone under a heading per day, as nested
// ordered lists; dates kept in their own direction; an emphasised entry
// told by a word as well as its drawing.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { I18nProvider, Timeline, timelineDays, type TimelineEntry } from "./index";

afterEach(cleanup);

/** Text with the formatters' non-breaking spaces as plain ones. */
const plain = (text: string | null) => (text ?? "").replace(/\u00a0/g, " ");

const ENTRIES: TimelineEntry[] = [
  { id: "due", at: "2026-09-25T00:00:00Z", kind: "Reply due", emphasis: true },
  { id: "notice", at: Date.UTC(2026, 8, 4, 8, 15), when: "11:15", kind: "Notice sent", actor: "Operator Ivanova", text: "By email." },
  { id: "received", at: new Date("2026-09-03T11:05:00Z"), when: "14:05", kind: "Received", text: "Forwarded by the Bank of Russia." },
  { id: "registered", at: "2026-09-04T07:40:00Z", when: "10:40", kind: "Registered" },
];

describe("timelineDays", () => {
  it("sorts by date, oldest first, and groups by the day in the time zone", () => {
    const days = timelineDays(ENTRIES, "Europe/Moscow");
    expect(days.map((d) => [d.day, d.entries.map((e) => e.id)])).toEqual([
      ["2026-09-03", ["received"]],
      ["2026-09-04", ["registered", "notice"]],
      ["2026-09-25", ["due"]],
    ]);
  });

  it("counts the day in the time zone given: 22:30 UTC is the next day in Moscow", () => {
    const late: TimelineEntry[] = [{ id: "a", at: "2026-09-03T22:30:00Z", kind: "Received" }];
    expect(timelineDays(late, "UTC")[0]!.day).toBe("2026-09-03");
    expect(timelineDays(late, "Europe/Moscow")[0]!.day).toBe("2026-09-04");
  });

  it("keeps the caller's order for entries at the same time", () => {
    const same: TimelineEntry[] = [
      { id: "b", at: 1000, kind: "B" },
      { id: "a", at: 1000, kind: "A" },
    ];
    expect(timelineDays(same, "UTC")[0]!.entries.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("refuses an entry without a valid date, naming it", () => {
    expect(() => timelineDays([{ id: "bad", at: "not a date", kind: "X" }])).toThrow(/"bad"/);
  });
});

describe("Timeline", () => {
  it("is an ordered list of days, each with a heading and its own ordered list of entries", () => {
    render(<Timeline label="Case history" entries={ENTRIES} timeZone="Europe/Moscow" />);
    const list = screen.getByRole("list", { name: "Case history" });
    const days = within(list).getAllByRole("listitem").filter((li) => li.parentElement === list);
    expect(days).toHaveLength(3);
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => plain(h.textContent))).toEqual(["September 3, 2026", "September 4, 2026", "September 25, 2026"]);
    const second = within(days[1]!).getByRole("list");
    expect(second.tagName).toBe("OL");
    expect(within(second).getAllByRole("listitem").map((li) => li.querySelector(".stoa-timeline__kind")?.textContent)).toEqual(["Registered", "Notice sent"]);
  });

  it("shows each date and time in its own direction, with a machine-readable date", () => {
    render(<Timeline label="Case history" entries={ENTRIES} timeZone="Europe/Moscow" />);
    const time = screen.getByText("14:05");
    expect([time.tagName, time.getAttribute("dir"), time.getAttribute("datetime")]).toEqual(["TIME", "auto", "2026-09-03T11:05:00.000Z"]);
    const heading = screen.getAllByRole("heading")[0]!.querySelector("time")!;
    expect([heading.tagName, heading.getAttribute("datetime")]).toEqual(["TIME", "2026-09-03"]);
  });

  it("shows the actor isolated, and the text", () => {
    render(<Timeline label="Case history" entries={ENTRIES} timeZone="UTC" />);
    const actor = screen.getByText("Operator Ivanova");
    expect(actor.tagName).toBe("BDI");
    expect(screen.getByText("By email.")).toBeTruthy();
  });

  it("reads a word before an emphasised entry, and draws its symbol hidden", () => {
    render(<Timeline label="Case history" entries={ENTRIES} timeZone="UTC" />);
    const due = screen.getByText("Reply due").closest("li")!;
    expect(due.className).toContain("stoa-timeline__entry--emphasis");
    expect(due.textContent).toContain("Important: Reply due");
    expect(due.querySelector(".stoa-timeline__symbol")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes the day headings' level and words from the caller", () => {
    render(<Timeline label="Case history" entries={ENTRIES} timeZone="UTC" dayLevel={4} formatDay={(d) => `Day ${d.getUTCDate()}`} />);
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(["Day 3", "Day 4", "Day 25"]);
  });

  it("says when it is empty, in the locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Timeline label="История" entries={[]} />
      </I18nProvider>,
    );
    expect(screen.getByText("Пока ничего не произошло.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("writes the day headings in the locale", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Timeline label="История" entries={ENTRIES.slice(2, 3)} timeZone="Europe/Moscow" />
      </I18nProvider>,
    );
    expect(plain(screen.getByRole("heading").textContent)).toBe("3 сентября 2026 г.");
  });
});
