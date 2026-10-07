// @vitest-environment jsdom
// FindingsList: findings grouped by severity, most severe first, each
// group a list named by its heading with the count; each finding with a
// symbol and a word, its text, code and source; a default severity; and
// the empty state.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DEFAULT_FINDING_SEVERITY, FindingsList, I18nProvider, groupFindings, type FindingItem } from "./index";

afterEach(cleanup);

const FINDINGS: FindingItem[] = [
  { id: "long", severity: "info", text: "A sentence of 41 words." },
  { id: "deadline", code: "R-07", text: "A running deadline is not stated.", source: "161-FZ, art. 8, part 3.4" },
  { id: "ground", code: "R-01", severity: "error", text: "No legal ground is named.", source: "Rubric, item 1" },
  { id: "option", text: "An option is not offered." },
];

describe("groupFindings", () => {
  it("groups by severity, most severe first, keeping the caller's order and leaving empty groups out", () => {
    expect(groupFindings(FINDINGS).map((g) => [g.severity, g.findings.map((f) => f.id)])).toEqual([
      ["error", ["ground"]],
      ["warning", ["deadline", "option"]],
      ["info", ["long"]],
    ]);
    expect(groupFindings([{ id: "a", text: "A" }]).map((g) => g.severity)).toEqual(["warning"]);
  });

  it("takes a finding without a severity as a warning", () => {
    expect(DEFAULT_FINDING_SEVERITY).toBe("warning");
  });
});

describe("FindingsList", () => {
  it("heads each group with its symbol and count, and names its list with the heading", () => {
    render(<FindingsList findings={FINDINGS} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["✗ Errors: 1", "! Warnings: 2", "◆ Notes: 1"]);
    const warnings = screen.getByRole("list", { name: "Warnings: 2" });
    expect(within(warnings).getAllByRole("listitem")).toHaveLength(2);
  });

  it("gives each finding its severity in a word as well as a hidden symbol, its text, code and source", () => {
    render(<FindingsList findings={FINDINGS} />);
    const ground = screen.getByText("No legal ground is named.").closest("li")!;
    expect(ground.querySelector(".stoa-findings__symbol")?.getAttribute("aria-hidden")).toBe("true");
    expect(ground.querySelector(".stoa-finding__text")?.textContent).toBe("Error: No legal ground is named.");
    const code = within(ground).getByText("R-01");
    expect([code.tagName, code.getAttribute("dir")]).toEqual(["BDI", "ltr"]);
    expect(ground.querySelector(".stoa-finding__source")?.textContent).toBe("Source: Rubric, item 1");
    expect(ground.querySelector(".stoa-finding__source bdi")).toBeTruthy();
    expect(screen.getByText("An option is not offered.").closest("li")?.querySelector(".stoa-finding__meta")).toBeNull();
  });

  it("says when nothing was found, in a positive callout", () => {
    render(<FindingsList findings={[]} />);
    expect(screen.getByText("No findings.").closest(".stoa-callout")?.className).toContain("stoa-callout--positive");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("speaks Russian and takes the group heading level", () => {
    render(
      <I18nProvider locale="ru-RU">
        <FindingsList findings={FINDINGS} groupLevel={4} emptyText="—" />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(["✗ Ошибки: 1", "! Предупреждения: 2", "◆ Примечания: 1"]);
    expect(screen.getByText("Rubric, item 1").closest(".stoa-finding__source")?.textContent).toBe("Источник: Rubric, item 1");
  });
});
