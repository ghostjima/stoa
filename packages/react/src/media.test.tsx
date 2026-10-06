// @vitest-environment jsdom
// The breakpoints: their values are the tokens', and useBreakpoint and
// useMediaQuery follow the media queries as they change.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { BREAKPOINTS, breakpointQueries, useBreakpoint, useMediaQuery } from "./index";

/** A stand-in for matchMedia over a viewport width in rem, which the test
 * changes; each query list tells its listeners when its answer flips. */
function fakeViewport(widthRem: number) {
  let width = widthRem;
  const lists: { query: string; listeners: Set<() => void>; last: boolean }[] = [];
  const evaluate = (query: string) => {
    const max = /max-width: ([\d.]+)rem/.exec(query);
    const min = /min-width: ([\d.]+)rem/.exec(query);
    if (max) return width <= Number(max[1]);
    if (min) return width >= Number(min[1]);
    return false;
  };
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    const entry = { query, listeners: new Set<() => void>(), last: evaluate(query) };
    lists.push(entry);
    return {
      get matches() {
        return evaluate(query);
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => entry.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => entry.listeners.delete(listener),
    } as unknown as MediaQueryList;
  });
  return (next: number) => {
    width = next;
    for (const entry of lists) {
      const now = evaluate(entry.query);
      if (now !== entry.last) {
        entry.last = now;
        entry.listeners.forEach((listener) => listener());
      }
    }
  };
}

// jsdom has no matchMedia of its own; the spy needs one to replace.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: () => ({}) });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--stoa-breakpoint-narrow");
  document.documentElement.style.removeProperty("--stoa-breakpoint-wide");
});

describe("breakpoints", () => {
  it("are the breakpoint tokens' values", () => {
    const tokens = JSON.parse(readFileSync(join(__dirname, "../../tokens/tokens/primitive.json"), "utf8"));
    expect(BREAKPOINTS).toEqual({ narrow: tokens.breakpoint.narrow.$value, wide: tokens.breakpoint.wide.$value });
    // Stoa's own stylesheet repeats the narrow value in its media queries.
    const css = readFileSync(join(__dirname, "styles.css"), "utf8");
    expect(css).toContain(`@media (max-width: ${BREAKPOINTS.narrow})`);
  });

  it("are read from the document's tokens when tokens.css is loaded", () => {
    document.documentElement.style.setProperty("--stoa-breakpoint-narrow", "36rem");
    document.documentElement.style.setProperty("--stoa-breakpoint-wide", "72rem");
    expect(breakpointQueries()).toEqual({ narrow: "(max-width: 36rem)", wide: "(min-width: 72rem)" });
    document.documentElement.style.removeProperty("--stoa-breakpoint-narrow");
    document.documentElement.style.removeProperty("--stoa-breakpoint-wide");
    expect(breakpointQueries()).toEqual({ narrow: "(max-width: 40rem)", wide: "(min-width: 64rem)" });
  });
});

describe("useBreakpoint", () => {
  it("is narrow up to 40rem, wide from 64rem, medium between, and follows a resize", () => {
    const resize = fakeViewport(23.4);
    let seen = "";
    function Probe() {
      seen = useBreakpoint();
      return null;
    }
    render(<Probe />);
    expect(seen).toBe("narrow");
    act(() => resize(40));
    expect(seen).toBe("narrow");
    act(() => resize(48));
    expect(seen).toBe("medium");
    act(() => resize(64));
    expect(seen).toBe("wide");
  });
});

describe("useMediaQuery", () => {
  it("answers a query and follows it", () => {
    const resize = fakeViewport(30);
    let seen: boolean | null = null;
    function Probe() {
      seen = useMediaQuery("(min-width: 50rem)");
      return null;
    }
    render(<Probe />);
    expect(seen).toBe(false);
    act(() => resize(60));
    expect(seen).toBe(true);
  });
});
