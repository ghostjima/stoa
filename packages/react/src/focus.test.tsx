// @vitest-environment jsdom
// keepFocusInPlace and the Callout that uses it: after the focused
// element is removed, the focus goes to the tab stop that stands where it
// was. Dialogs, lists and toasts are checked in a browser
// (e2e/focus.e2e.ts), where React Aria's own restoring runs.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Button, Callout, keepFocusInPlace } from "./index";

afterEach(cleanup);

function Bar({ after = true, before = false }: { after?: boolean; before?: boolean }) {
  const [shown, setShown] = useState(true);
  return (
    <div>
      {before && <button type="button">Before</button>}
      {shown && (
        <div data-testid="bar">
          <button
            type="button"
            onClick={(e) => {
              keepFocusInPlace(e.currentTarget);
              setShown(false);
            }}
          >
            Apply
          </button>
        </div>
      )}
      <p>Rows</p>
      {after && <button type="button">After</button>}
    </div>
  );
}

describe("keepFocusInPlace", () => {
  it("moves the focus to the next tab stop where the removed element was", async () => {
    render(<Bar before />);
    const apply = screen.getByRole("button", { name: "Apply" });
    act(() => apply.focus());
    fireEvent.click(apply);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("After"));
  });

  it("moves it to the tab stop before, when nothing follows", async () => {
    render(<Bar before after={false} />);
    const apply = screen.getByRole("button", { name: "Apply" });
    act(() => apply.focus());
    fireEvent.click(apply);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Before"));
  });

  it("leaves the focus alone when it is no longer on the removed element", async () => {
    render(<Bar before />);
    const apply = screen.getByRole("button", { name: "Apply" });
    keepFocusInPlace(apply);
    act(() => screen.getByRole("button", { name: "Before" }).focus());
    act(() => apply.parentElement!.remove());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement?.textContent).toBe("Before");
  });
});

describe("keepFocusInPlace inside a tab stop", () => {
  it("moves the focus to the tab stop that held the removed element, not to the next one after it", async () => {
    // A grid's active cell (one tab stop) with an editor in it, and a
    // button after the grid.
    function Cell() {
      const [editing, setEditing] = useState(true);
      return (
        <div>
          <div role="grid" aria-label="Orders">
            <div role="row">
              <div role="gridcell" tabIndex={0}>
                {editing ? (
                  <input
                    aria-label="Note"
                    onKeyDown={(e) => {
                      keepFocusInPlace(e.currentTarget);
                      setEditing(false);
                    }}
                  />
                ) : (
                  "Saved"
                )}
              </div>
            </div>
          </div>
          <button type="button">Export</button>
        </div>
      );
    }
    render(<Cell />);
    const input = screen.getByRole("textbox", { name: "Note" });
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("gridcell"));
  });

  it("still moves it to the next tab stop inside that one, when there is one", async () => {
    function Region() {
      const [shown, setShown] = useState(true);
      return (
        <div>
          <div tabIndex={0} aria-label="Notes" role="region">
            {shown && (
              <button
                type="button"
                onClick={(e) => {
                  keepFocusInPlace(e.currentTarget);
                  setShown(false);
                }}
              >
                Apply
              </button>
            )}
            <button type="button">Inside</button>
          </div>
          <button type="button">After</button>
        </div>
      );
    }
    render(<Region />);
    const apply = screen.getByRole("button", { name: "Apply" });
    act(() => apply.focus());
    fireEvent.click(apply);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Inside"));
  });
});

describe("Callout", () => {
  it("leaves the focus on the tab stop that takes its place once dismissed", async () => {
    function Note() {
      const [shown, setShown] = useState(true);
      return (
        <div>
          {shown ? <Callout onDismiss={() => setShown(false)}>Replays start at ten times real speed.</Callout> : <Button>Show it again</Button>}
        </div>
      );
    }
    render(<Note />);
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    act(() => dismiss.focus());
    fireEvent.click(dismiss);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Show it again"));
  });
});
