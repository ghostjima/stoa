// @vitest-environment jsdom
// Button variants: every variant is a button in every state, and the state
// is on the element for the stylesheet to draw.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button, I18nProvider, type ButtonProps } from "./index";

afterEach(cleanup);

const VARIANTS: NonNullable<ButtonProps["variant"]>[] = ["default", "primary", "secondary", "ghost", "danger"];

describe.each(VARIANTS)("Button, %s", (variant) => {
  it("is a button named by its label, with the variant's class", () => {
    render(<Button variant={variant}>Delete 3 orders</Button>);
    const button = screen.getByRole("button", { name: "Delete 3 orders" });
    expect(button.className.split(" ")).toEqual(["stoa-button", `stoa-button--${variant}`]);
  });

  it("marks hover and press for the stylesheet, and calls onPress", () => {
    const onPress = vi.fn();
    render(
      <Button variant={variant} onPress={onPress}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    expect(button.hasAttribute("data-hovered")).toBe(true);
    fireEvent.pointerDown(button, { pointerType: "mouse", button: 0, pointerId: 1 });
    expect(button.hasAttribute("data-pressed")).toBe(true);
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalled();
  });

  it("shows the focus ring after keyboard focus, and presses with Enter and Space", () => {
    const onPress = vi.fn();
    render(
      <Button variant={variant} onPress={onPress}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => button.focus());
    expect(button.hasAttribute("data-focus-visible")).toBe(true);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(button, { key: " " });
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it("is disabled: not pressable, and marked for the stylesheet", () => {
    const onPress = vi.fn();
    render(
      <Button variant={variant} onPress={onPress} isDisabled>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.hasAttribute("data-disabled")).toBe(true);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Button in a right-to-left page", () => {
  it("keeps its name and variant under an Arabic locale", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <Button variant="danger">حذف</Button>
        </div>
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "حذف" }).className).toContain("stoa-button--danger");
  });
});

describe("Button, small", () => {
  it("adds the small size's class, which the stylesheet sizes with the other small controls", () => {
    render(
      <Button variant="ghost" size="small">
        Export
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Export" }).className.split(" ")).toEqual(["stoa-button", "stoa-button--ghost", "stoa-button--small"]);
    const css = readFileSync(join(__dirname, "styles.css"), "utf8");
    const rule = css.slice(css.indexOf("/* The small size, for toolbars and headers. */"));
    expect(rule.slice(0, rule.indexOf("{"))).toContain(".stoa-button--small");
  });
});

describe("Button with a keyboard shortcut", () => {
  it("passes aria-keyshortcuts through to the button", () => {
    render(<Button aria-keyshortcuts="S">Stop</Button>);
    expect(screen.getByRole("button", { name: "Stop" }).getAttribute("aria-keyshortcuts")).toBe("S");
  });

  it("shows a shortcut's keys after its label, hidden from assistive technology, which reads aria-keyshortcuts", () => {
    render(<Button shortcut={{ key: "s" }}>Stop</Button>);
    const button = screen.getByRole("button", { name: "Stop" });
    expect(button.getAttribute("aria-keyshortcuts")).toBe("S");
    const hint = button.querySelector(".stoa-button__shortcut")!;
    expect(hint.getAttribute("aria-hidden")).toBe("true");
    expect(hint.textContent).toBe("S");
    // The label alone names the button.
    expect(button.querySelector(".stoa-button__label")?.textContent).toBe("Stop");
  });

  it("writes modifiers for aria-keyshortcuts in ARIA's names, and draws them as the platform prints them", () => {
    render(<Button shortcut={{ key: "k", modifiers: ["mod", "shift"] }}>Search</Button>);
    const button = screen.getByRole("button", { name: "Search" });
    // jsdom is not an Apple platform: "mod" is Control.
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Control+Shift+K");
    expect([...button.querySelectorAll(".stoa-button__shortcut .stoa-kbd")].map((k) => k.textContent)).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("names the space bar Space for assistive technology, and in the locale's word on the key", () => {
    render(
      <I18nProvider locale="ru-RU">
        <Button shortcut={{ key: " " }}>Пауза</Button>
      </I18nProvider>,
    );
    const button = screen.getByRole("button", { name: "Пауза" });
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Space");
    expect(button.querySelector(".stoa-button__shortcut")?.textContent).toBe("Пробел");
  });

  it("keeps a symbol as it is", () => {
    render(<Button shortcut={{ key: "?" }}>Keyboard shortcuts</Button>);
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" }).getAttribute("aria-keyshortcuts")).toBe("?");
  });
});
