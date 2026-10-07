// @vitest-environment jsdom
// DetailHeader and focusWhenReady: the title as a heading that can take
// the focus on open, identifiers left to right, the status as a badge,
// and Back moving the focus to the caller's target, never to the body.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { DetailHeader, I18nProvider, focusWhenReady } from "./index";

afterEach(cleanup);

describe("DetailHeader", () => {
  it("draws the title as a heading of the given level, identifiers left to right, the status, meta and actions", () => {
    render(
      <DetailHeader
        title="Card blocked, Ivanova A. P."
        level={3}
        titleId="case-title"
        identifiers={[
          { label: "Case", value: "Z-000104" },
          { label: "Account", value: "40817 810 5 0000 0012345" },
        ]}
        status={{ tone: "warning", label: "Facts requested" }}
        meta={<span>Antifraud</span>}
        actions={<button type="button">Assign</button>}
      />,
    );
    const heading = screen.getByRole("heading", { level: 3, name: "Card blocked, Ivanova A. P." });
    expect([heading.id, heading.getAttribute("tabindex")]).toEqual(["case-title", "-1"]);
    const id = screen.getByText("Z-000104");
    expect([id.tagName, id.getAttribute("dir")]).toEqual(["BDI", "ltr"]);
    expect(screen.getByText("Account").tagName).toBe("DT");
    expect(screen.getByText("Facts requested").closest(".stoa-badge")?.className).toContain("stoa-badge--warning");
    expect(screen.getByText("Antifraud")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Assign" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("moves the focus to the title on open, only when asked", () => {
    const { unmount } = render(<DetailHeader title="Case" />);
    expect(document.activeElement).toBe(document.body);
    unmount();
    render(<DetailHeader title="Case" focusOnOpen />);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Case" }));
  });

  it("draws Back's key and gives it to assistive technology, in the locale's words", () => {
    render(
      <I18nProvider locale="ru-RU">
        <DetailHeader title="Обращение" back={{ onBack: () => undefined, focusAfter: "queue", shortcut: { key: "q" } }} />
      </I18nProvider>,
    );
    const back = screen.getByRole("button", { name: "Назад" });
    expect(back.getAttribute("aria-keyshortcuts")).toBe("Q");
  });

  it("moves the focus after Back to the target the list draws again, never to the body", async () => {
    function Page() {
      const [open, setOpen] = useState(true);
      return open ? (
        <DetailHeader title="Case" back={{ onBack: () => setOpen(false), focusAfter: "row-104" }} />
      ) : (
        <ul>
          <li>
            <button type="button">Row 101</button>
          </li>
          <li>
            <button type="button" id="row-104">
              Row 104
            </button>
          </li>
        </ul>
      );
    }
    render(<Page />);
    const back = screen.getByRole("button", { name: "Back" });
    act(() => back.focus());
    fireEvent.click(back);
    await waitFor(() => expect(document.activeElement?.id).toBe("row-104"));
  });

  it("takes a function that finds the target", async () => {
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          {open ? (
            <DetailHeader title="Case" back={{ onBack: () => setOpen(false), focusAfter: () => document.querySelector<HTMLElement>("[data-active]") }} />
          ) : (
            <div role="grid" aria-label="Queue">
              <div role="row">
                <div role="gridcell" tabIndex={0} data-active="">
                  Z-000104
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    render(<Page />);
    const back = screen.getByRole("button", { name: "Back" });
    act(() => back.focus());
    fireEvent.click(back);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Z-000104"));
  });
});

describe("focusWhenReady", () => {
  it("keeps the focus on a tab stop where the control was until the target arrives, then moves it there", async () => {
    document.body.innerHTML = '<div id="bar"><button id="back">Back</button></div><button id="next">Next</button>';
    const back = document.getElementById("back")!;
    back.focus();
    focusWhenReady("late", back);
    document.getElementById("bar")!.remove();
    await waitFor(() => expect(document.activeElement?.id).toBe("next"));
    const late = document.createElement("button");
    late.id = "late";
    document.body.append(late);
    await waitFor(() => expect(document.activeElement?.id).toBe("late"));
    document.body.innerHTML = "";
  });

  it("leaves the focus alone once the person has moved it elsewhere", async () => {
    document.body.innerHTML = '<button id="back">Back</button><button id="other">Other</button>';
    const back = document.getElementById("back")!;
    back.focus();
    focusWhenReady("late", back);
    document.getElementById("other")!.focus();
    const late = document.createElement("button");
    late.id = "late";
    document.body.append(late);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement?.id).toBe("other");
    document.body.innerHTML = "";
  });

  it("focuses a target that is already there at once", () => {
    document.body.innerHTML = '<button id="back">Back</button><button id="row">Row</button>';
    const back = document.getElementById("back")!;
    back.focus();
    focusWhenReady(document.getElementById("row")!, back);
    expect(document.activeElement?.id).toBe("row");
    document.body.innerHTML = "";
  });
});
