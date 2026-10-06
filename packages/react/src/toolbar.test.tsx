// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button, ButtonGroup, I18nProvider, Slider, Toolbar, ToolbarSeparator } from "./index";

afterEach(cleanup);

function Transport({ onPlay = () => {} }: { onPlay?: () => void }) {
  return (
    <Toolbar label="Playback">
      <Button variant="primary" onPress={onPlay}>
        Play
      </Button>
      <ToolbarSeparator />
      <ButtonGroup label="Step">
        <Button>Back</Button>
        <Button isDisabled>Forward</Button>
        <Button>Live</Button>
      </ButtonGroup>
      <ToolbarSeparator />
      <Button variant="ghost">Reset</Button>
    </Toolbar>
  );
}

const focused = () => document.activeElement?.textContent;

describe("Toolbar", () => {
  it("is a horizontal toolbar named by its label, with groups and separators", () => {
    render(<Transport />);
    const toolbar = screen.getByRole("toolbar", { name: "Playback" });
    expect(toolbar.getAttribute("aria-orientation")).toBe("horizontal");
    expect(screen.getByRole("group", { name: "Step" }).className).toBe("stoa-button-group");
    const separators = screen.getAllByRole("separator");
    expect(separators).toHaveLength(2);
    expect(separators[0]!.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("moves between controls with the arrow keys, into and out of a group, skipping disabled ones", () => {
    render(<Transport />);
    act(() => screen.getByRole("button", { name: "Play" }).focus());
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(focused()).toBe("Back");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(focused()).toBe("Live");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(focused()).toBe("Reset");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(focused()).toBe("Live");
  });

  it("goes to the ends with Home and End", () => {
    render(<Transport />);
    act(() => screen.getByRole("button", { name: "Back" }).focus());
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(focused()).toBe("Reset");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(focused()).toBe("Play");
  });

  it("leaves in one Tab: Tab first moves to the last control, from which the browser moves on", () => {
    render(
      <>
        <Transport />
        <button type="button">After</button>
      </>,
    );
    act(() => screen.getByRole("button", { name: "Play" }).focus());
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(focused()).toBe("Reset");
    act(() => screen.getByRole("button", { name: "Live" }).focus());
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(focused()).toBe("Play");
  });

  it("leaves Home and End to a slider inside it", () => {
    const onChange = vi.fn();
    render(
      <Toolbar label="View">
        <Button>Fit</Button>
        <Slider label="Zoom" value={50} onChange={onChange} />
      </Toolbar>,
    );
    const slider = screen.getByRole("slider", { name: "Zoom" });
    act(() => slider.focus());
    fireEvent.keyDown(slider, { key: "Home" });
    expect(document.activeElement).toBe(slider);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("presses the focused control with Enter", () => {
    const onPlay = vi.fn();
    render(<Transport onPlay={onPlay} />);
    const play = screen.getByRole("button", { name: "Play" });
    act(() => play.focus());
    fireEvent.keyDown(play, { key: "Enter" });
    fireEvent.keyUp(play, { key: "Enter" });
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it("reverses the arrow keys in a right-to-left locale; Home and End keep their meaning", () => {
    render(
      <I18nProvider locale="ar-u-nu-arab">
        <div dir="rtl">
          <Transport />
        </div>
      </I18nProvider>,
    );
    act(() => screen.getByRole("button", { name: "Play" }).focus());
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(focused()).toBe("Back");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(focused()).toBe("Play");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(focused()).toBe("Reset");
  });
});

describe("ButtonGroup outside a toolbar", () => {
  it("is a named group whose buttons stay ordinary buttons", () => {
    render(
      <ButtonGroup label="Zoom">
        <Button>In</Button>
        <Button>Out</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Zoom" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
