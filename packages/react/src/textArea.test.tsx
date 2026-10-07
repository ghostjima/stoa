// @vitest-environment jsdom
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, TextArea, Ltr } from "./index";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const describedBy = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

function Controlled(props: { initial?: string; maxLength?: number; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <TextArea
      label="Concerns"
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
      maxLength={props.maxLength}
    />
  );
}

describe("TextArea", () => {
  it("is a multi-line textbox named by its visible label, with the rows it starts at", () => {
    render(<TextArea label="Concerns" value="" onChange={() => {}} rows={4} />);
    const field = screen.getByRole("textbox", { name: "Concerns" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field.getAttribute("rows")).toBe("4");
    expect(screen.getByText("Concerns").className).toBe("stoa-field__label");
  });

  it("keeps its label for assistive technology only with hideLabel", () => {
    render(<TextArea label="Concerns" hideLabel value="" onChange={() => {}} />);
    expect(screen.getByText("Concerns").className).toBe("stoa-visually-hidden");
    expect(screen.getByRole("textbox", { name: "Concerns" })).toBeTruthy();
  });

  it("reports each change, and keeps Enter as a new line", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const field = screen.getByRole("textbox", { name: "Concerns" }) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "First line\nSecond line" } });
    expect(onChange).toHaveBeenLastCalledWith("First line\nSecond line");
    expect(field.value).toBe("First line\nSecond line");
    const enter = fireEvent.keyDown(field, { key: "Enter" });
    expect(enter).toBe(true);
  });

  it("reads its description of nodes, then its error, as the field's description", () => {
    render(
      <TextArea
        label="Reason"
        value=""
        onChange={() => {}}
        description={
          <>
            Cite <Ltr>115-FZ</Ltr>
          </>
        }
        isInvalid
        errorMessage="Say which documents are awaited."
      />,
    );
    const field = screen.getByRole("textbox", { name: "Reason" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy(field)).toEqual(["Cite 115-FZ", "Say which documents are awaited."]);
  });

  it("draws no line under the field without a description or a limit", () => {
    const { container } = render(<TextArea label="Concerns" value="x" onChange={() => {}} description="" />);
    expect(container.querySelector(".stoa-textarea__foot")).toBeNull();
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBeNull();
  });

  it("with maxLength, sets the limit on the textarea and reads the count after the description, before the caller's ids", () => {
    render(
      <>
        <p id="extra">Seen by the signatory</p>
        <TextArea label="Note" value="Hello" onChange={() => {}} maxLength={120} description="A text message." aria-describedby="extra" />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "Note" });
    expect(field.getAttribute("maxlength")).toBe("120");
    expect(describedBy(field)).toEqual(["A text message.", "Characters: 5 of 120", "Seen by the signatory"]);
    // Drawn short, hidden from assistive technology, which reads the words.
    const drawn = document.querySelector(".stoa-textarea__count [aria-hidden='true']");
    expect(drawn?.textContent).toBe("5/120");
  });

  it("counts in the locale's words and digits", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <TextArea label="ملاحظة" value="مرحبا" onChange={() => {}} maxLength={120} />
      </I18nProvider>,
    );
    const field = screen.getByRole("textbox", { name: "ملاحظة" });
    expect(describedBy(field)).toEqual(["الأحرف: ٥ من ١٢٠"]);
  });

  it("marks a full field's count, and announces the characters left only once they are few", () => {
    vi.useFakeTimers();
    const { container } = render(<Controlled initial="" maxLength={100} />);
    const field = screen.getByRole("textbox", { name: "Concerns" });
    const status = () => screen.getByRole("status").textContent;
    act(() => vi.advanceTimersByTime(1500));
    expect(status()).toBe("");
    fireEvent.change(field, { target: { value: "x".repeat(89) } });
    act(() => vi.advanceTimersByTime(1500));
    expect(status()).toBe("");
    fireEvent.change(field, { target: { value: "x".repeat(91) } });
    act(() => vi.advanceTimersByTime(1500));
    expect(status()).toBe("9 characters left");
    fireEvent.change(field, { target: { value: "x".repeat(99) } });
    act(() => vi.advanceTimersByTime(1500));
    expect(status()).toBe("1 character left");
    expect(container.querySelector(".stoa-textarea__count")?.hasAttribute("data-full")).toBe(false);
    fireEvent.change(field, { target: { value: "x".repeat(100) } });
    act(() => vi.advanceTimersByTime(1500));
    expect(status()).toBe("0 characters left");
    expect(container.querySelector(".stoa-textarea__count")?.hasAttribute("data-full")).toBe(true);
  });

  it("announces the characters left in Russian with the count's form", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <I18nProvider locale="ru-RU">
        <TextArea label="Заметка" value={"x".repeat(98)} onChange={() => {}} maxLength={100} />
      </I18nProvider>,
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("status").textContent).toBe("Осталось 2 символа");
    rerender(
      <I18nProvider locale="ru-RU">
        <TextArea label="Заметка" value={"x".repeat(99)} onChange={() => {}} maxLength={100} />
      </I18nProvider>,
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("status").textContent).toBe("Остался 1 символ");
    rerender(
      <I18nProvider locale="ru-RU">
        <TextArea label="Заметка" value={"x".repeat(95)} onChange={() => {}} maxLength={100} />
      </I18nProvider>,
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("status").textContent).toBe("Осталось 5 символов");
  });

  it("gives the caller its textarea, and takes the focus when asked", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextArea ref={ref} label="Concerns" value="" onChange={() => {}} autoFocus />);
    expect(ref.current?.tagName).toBe("TEXTAREA");
    expect(document.activeElement).toBe(ref.current);
  });

  it("is disabled or read-only on request", () => {
    const { rerender } = render(<TextArea label="Concerns" value="x" onChange={() => {}} isDisabled />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(true);
    rerender(<TextArea label="Concerns" value="x" onChange={() => {}} isReadOnly />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).readOnly).toBe(true);
  });
});
