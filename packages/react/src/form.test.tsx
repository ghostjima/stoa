// @vitest-environment jsdom
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(cleanup);
import { I18nProvider, StatusBadge, Tabs, TextField } from "./index";

describe("StatusBadge", () => {
  it("carries a symbol and a word, not only a colour", () => {
    render(<StatusBadge tone="negative">Loses x = 0</StatusBadge>);
    const badge = screen.getByText(/Loses x = 0/);
    expect(badge.textContent).toContain("✗");
    expect(badge.className).toContain("stoa-badge--negative");
  });
});

describe("TextField", () => {
  it("submits on Enter", () => {
    const onEnter = vi.fn();
    render(<TextField label="Next line" value="x = 3" onChange={() => {}} onEnter={onEnter} dir="ltr" />);
    const input = screen.getByLabelText("Next line");
    expect(input.getAttribute("dir")).toBe("ltr");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("keeps its own description and adds an extra one when given", () => {
    render(
      <>
        <p id="field-notes">Read by two checks</p>
        <TextField label="Colour" value="red" onChange={() => {}} description="--stoa-color-text" aria-describedby="field-notes" />
      </>,
    );
    const ids = screen.getByLabelText("Colour").getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids).toContain("field-notes");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("--stoa-color-text");
  });
});

describe("TextField: its label", () => {
  it("shows its label by default, and keeps it for assistive technology only with hideLabel", () => {
    const { rerender } = render(<TextField label="Symbol" value="" onChange={() => {}} />);
    expect(screen.getByText("Symbol").className).toBe("stoa-field__label");
    rerender(<TextField label="Symbol" hideLabel value="" onChange={() => {}} />);
    expect(screen.getByText("Symbol").className).toBe("stoa-visually-hidden");
    expect(screen.getByRole("textbox", { name: "Symbol" })).toBeTruthy();
  });
});

describe("TextField: its face", () => {
  it("is in the sans face by default, and in the monospace face with mono", () => {
    const { rerender } = render(<TextField label="Issuer" value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Issuer" }).className).toBe("stoa-field__input");
    rerender(<TextField label="Issuer" mono value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Issuer" }).className).toBe("stoa-field__input stoa-field__input--mono");
  });
});

describe("TextField: ref, invalid state and search", () => {
  it("hands its input to a ref, so a caller can focus it", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField ref={ref} label="Symbol" value="" onChange={() => {}} />);
    expect(ref.current).toBe(screen.getByRole("textbox", { name: "Symbol" }));
    ref.current!.focus();
    expect(document.activeElement).toBe(ref.current);
  });

  it("marks the input invalid and reads the error message as its description, after its own", () => {
    const { rerender } = render(<TextField label="View name" value="" onChange={() => {}} description="Up to 40 letters" />);
    const input = screen.getByRole("textbox", { name: "View name" });
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("A view needs a name.")).toBeNull();
    rerender(<TextField label="View name" value="" onChange={() => {}} description="Up to 40 letters" isInvalid errorMessage="A view needs a name." />);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const error = screen.getByText("A view needs a name.");
    expect(error.className).toBe("stoa-field__error");
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Up to 40 letters", "A view needs a name."]);
    expect(input.closest(".stoa-field")?.hasAttribute("data-invalid")).toBe(true);
  });

  it("is a search box with type search", () => {
    render(<TextField type="search" label="Find an issue" value="" onChange={() => {}} />);
    const box = screen.getByRole("searchbox", { name: "Find an issue" });
    expect(box.getAttribute("type")).toBe("search");
  });

  it("reads its error in Arabic in a right-to-left page", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <TextField label="اسم العرض" value="" onChange={() => {}} isInvalid errorMessage="يحتاج العرض إلى اسم." />
        </div>
      </I18nProvider>,
    );
    const input = screen.getByRole("textbox", { name: "اسم العرض" });
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe("يحتاج العرض إلى اسم.");
  });
});

describe("Tabs", () => {
  it("moves between tabs with the arrow keys", () => {
    render(
      <Tabs
        label="Sections"
        items={[
          { id: "a", label: "Check", content: <p>check panel</p> },
          { id: "b", label: "Examples", content: <p>examples panel</p> },
        ]}
      />,
    );
    const first = screen.getByRole("tab", { name: "Check" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Examples" }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps inactive panels mounted and inert with keepMounted, so their state survives", () => {
    let mounts = 0;
    const Counted = () => {
      React.useEffect(() => {
        mounts += 1;
      }, []);
      return <p>examples panel</p>;
    };
    render(
      <Tabs
        label="Sections"
        keepMounted
        items={[
          { id: "a", label: "Check", content: <p>check panel</p> },
          { id: "b", label: "Examples", content: <Counted /> },
        ]}
      />,
    );
    // The inactive panel is in the document but inert, so it is neither
    // shown nor reachable.
    const hidden = screen.getByText("examples panel").closest(".stoa-tabs__panel");
    expect(hidden?.hasAttribute("inert")).toBe(true);
    const tab = screen.getByRole("tab", { name: "Examples" });
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Check" }), { key: "ArrowRight" });
    expect(mounts).toBe(1);
  });

  it("unmounts inactive panels by default", () => {
    render(
      <Tabs
        label="Sections"
        items={[
          { id: "a", label: "Check", content: <p>check panel</p> },
          { id: "b", label: "Examples", content: <p>examples panel</p> },
        ]}
      />,
    );
    expect(screen.queryByText("examples panel")).toBeNull();
  });
});
