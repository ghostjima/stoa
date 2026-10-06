// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { createRef, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Heatmap, type HeatmapHandle, Ladder, type LadderHandle, signalTokensChanged, TOKENS_EVENT } from "./index";
import { sampleBook, sampleHeatmap } from "./fixtures";

// A canvas 2d context stub: jsdom does not implement one without the
// optional `canvas` native package. Records the fill colour used for the
// background fill (the first `fillRect` after each `setTransform`, which
// is how `fitCanvas` starts a draw) and how many draws happened, so tests
// can check both the value read and that a signal causes exactly one
// extra draw, not a cascade.
type FakeCtx = { draws: number; surfaceFills: string[] };

function fakeContext(): FakeCtx & Record<string, unknown> {
  const surfaceFills: string[] = [];
  let sinceTransform = false;
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    draws: 0,
    surfaceFills,
    setTransform() {
      ctx.draws++;
      sinceTransform = true;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    strokeRect() {},
    lineWidth: 1,
    fillText() {},
    measureText: (text: string) => ({ width: text.length * 7, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 3 }),
    fillRect() {
      if (sinceTransform) {
        surfaceFills.push(String(ctx.fillStyle));
        sinceTransform = false;
      }
    },
  };
  return ctx;
}

// `win` selects the realm to patch: an iframe has its own
// `HTMLCanvasElement`, so a component rendered inside one needs the stub
// installed on that window's prototype rather than on this one's.
function installFakeCanvas(win: Window & typeof globalThis = window) {
  const proto = win.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  const contexts = new WeakMap<HTMLCanvasElement, FakeCtx>();
  // @ts-expect-error -- test stub, narrower than the real overload set.
  proto.getContext = function (this: HTMLCanvasElement, id: string) {
    if (id !== "2d") return null;
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = fakeContext();
      contexts.set(this, ctx);
    }
    return ctx;
  };
  return { contexts, restore: () => (proto.getContext = original) };
}

function Themed({ surface, children }: { surface: string; children: ReactNode }) {
  return <div style={{ "--stoa-color-surface": surface } as never}>{children}</div>;
}

describe("token change signal", () => {
  let canvasStub: ReturnType<typeof installFakeCanvas>;
  afterEach(() => canvasStub?.restore());

  it("re-reads tokens and redraws, from a stoa:tokens event on an ancestor, even while paused", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <Themed surface="rgb(1, 1, 1)">
        <Ladder ref={ref} label="Book" />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(1, 1, 1)");
    const drawsAfterFirstFrame = ctx.draws;

    // Signal fires with no new data (playback paused): the ladder still
    // redraws, from the wrapper's now-different value.
    wrapper.style.setProperty("--stoa-color-surface", "rgb(2, 2, 2)");
    act(() => signalTokensChanged(wrapper));

    expect(ctx.surfaceFills.at(-1)).toBe("rgb(2, 2, 2)");
    expect(ctx.draws).toBe(drawsAfterFirstFrame + 1);
  });

  it("reads a different value per instance, scoped to each one's own wrapper", () => {
    canvasStub = installFakeCanvas();
    const refA = createRef<LadderHandle>();
    const refB = createRef<LadderHandle>();
    const { container } = render(
      <div>
        <Themed surface="rgb(10, 10, 10)">
          <Ladder ref={refA} label="Light" />
        </Themed>
        <Themed surface="rgb(20, 20, 20)">
          <Ladder ref={refB} label="Dark" />
        </Themed>
      </div>,
    );
    const [canvasA, canvasB] = container.querySelectorAll("canvas");
    act(() => {
      refA.current!.draw(sampleBook());
      refB.current!.draw(sampleBook());
    });
    expect(canvasStub.contexts.get(canvasA!)!.surfaceFills.at(-1)).toBe("rgb(10, 10, 10)");
    expect(canvasStub.contexts.get(canvasB!)!.surfaceFills.at(-1)).toBe("rgb(20, 20, 20)");
  });

  it("does not cause a redraw loop: a signal draws once, not repeatedly", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <Themed surface="rgb(1, 1, 1)">
        <Ladder ref={ref} label="Book" />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;

    for (let i = 0; i < 3; i++) {
      const before = ctx.draws;
      wrapper.style.setProperty("--stoa-color-surface", `rgb(${i}, ${i}, ${i})`);
      act(() => signalTokensChanged(wrapper));
      expect(ctx.draws).toBe(before + 1);
    }
  });

  it("also redraws a Heatmap from the signal, from its own wrapper", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<HeatmapHandle>();
    const { container } = render(
      <Themed surface="rgb(3, 3, 3)">
        <Heatmap ref={ref} label="Liquidity" height={80} />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleHeatmap(4, 4)));
    const ctx = canvasStub.contexts.get(canvas)!;
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(3, 3, 3)");

    wrapper.style.setProperty("--stoa-color-surface", "rgb(4, 4, 4)");
    act(() => signalTokensChanged(wrapper));
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(4, 4, 4)");
  });

  it("redraws only the wrapper a signal is dispatched on, not a sibling", () => {
    canvasStub = installFakeCanvas();
    const refA = createRef<LadderHandle>();
    const refB = createRef<LadderHandle>();
    const { container } = render(
      <div>
        <Themed surface="rgb(10, 10, 10)">
          <Ladder ref={refA} label="Light" />
        </Themed>
        <Themed surface="rgb(20, 20, 20)">
          <Ladder ref={refB} label="Dark" />
        </Themed>
      </div>,
    );
    const outer = container.firstElementChild as HTMLElement;
    const [wrapperA, wrapperB] = Array.from(outer.children) as HTMLElement[];
    const [canvasA, canvasB] = container.querySelectorAll("canvas");
    act(() => {
      refA.current!.draw(sampleBook());
      refB.current!.draw(sampleBook());
    });
    const ctxA = canvasStub.contexts.get(canvasA!)!;
    const ctxB = canvasStub.contexts.get(canvasB!)!;
    const drawsA = ctxA.draws;
    const drawsB = ctxB.draws;

    wrapperA!.style.setProperty("--stoa-color-surface", "rgb(11, 11, 11)");
    wrapperB!.style.setProperty("--stoa-color-surface", "rgb(21, 21, 21)");
    act(() => signalTokensChanged(wrapperA!));

    expect(ctxA.draws).toBe(drawsA + 1);
    expect(ctxA.surfaceFills.at(-1)).toBe("rgb(11, 11, 11)");
    expect(ctxB.draws).toBe(drawsB);
    expect(ctxB.surfaceFills.at(-1)).toBe("rgb(20, 20, 20)");
  });

  it("redraws immediately when the <html> data-theme attribute changes", async () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <Themed surface="rgb(1, 1, 1)">
        <Ladder ref={ref} label="Book" />
      </Themed>,
    );
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;
    const before = ctx.draws;

    try {
      await act(async () => {
        document.documentElement.dataset.theme = "dark";
        // Flush the MutationObserver's microtask queue.
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(ctx.draws).toBe(before + 1);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it("removes its listener on unmount", () => {
    canvasStub = installFakeCanvas();
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const ref = createRef<LadderHandle>();
    const { unmount } = render(
      <Themed surface="rgb(1, 1, 1)">
        <Ladder ref={ref} label="Book" />
      </Themed>,
    );
    act(() => ref.current!.draw(sampleBook()));
    const addCall = addSpy.mock.calls.find(([type, , opts]) => type === TOKENS_EVENT && opts === true);
    expect(addCall).toBeTruthy();
    const handler = addCall![1];

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(TOKENS_EVENT, handler, true);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("keeps exactly one listener when strict mode double-invokes effects", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <StrictMode>
        <Themed surface="rgb(1, 1, 1)">
          <Ladder ref={ref} label="Book" />
        </Themed>
      </StrictMode>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;
    const before = ctx.draws;

    wrapper.style.setProperty("--stoa-color-surface", "rgb(9, 9, 9)");
    act(() => signalTokensChanged(wrapper));

    expect(ctx.draws).toBe(before + 1);
  });

  it("still arrives when the event does not bubble", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <Themed surface="rgb(1, 1, 1)">
        <Ladder ref={ref} label="Book" />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;
    const before = ctx.draws;

    wrapper.style.setProperty("--stoa-color-surface", "rgb(7, 7, 7)");
    act(() => {
      wrapper.dispatchEvent(new CustomEvent(TOKENS_EVENT, { bubbles: false }));
    });

    expect(ctx.draws).toBe(before + 1);
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(7, 7, 7)");
  });

  it("still arrives when an ancestor stops the event's propagation", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container } = render(
      <div>
        <Themed surface="rgb(1, 1, 1)">
          <Ladder ref={ref} label="Book" />
        </Themed>
      </div>,
    );
    const outer = container.firstElementChild as HTMLElement;
    const wrapper = outer.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;

    // First round: an ancestor stops the event on its way back up, after
    // the capture-phase listener has run. Second round: the ancestor stops
    // it in the capture phase, which still runs after the document's own,
    // the document being further out.
    for (const [round, capture] of [[8, false], [9, true]] as const) {
      const stop = (e: Event) => e.stopPropagation();
      outer.addEventListener(TOKENS_EVENT, stop, capture);
      const before = ctx.draws;
      const surface = `rgb(${round}, ${round}, ${round})`;
      wrapper.style.setProperty("--stoa-color-surface", surface);
      act(() => signalTokensChanged(wrapper));
      outer.removeEventListener(TOKENS_EVENT, stop, capture);

      expect(ctx.draws).toBe(before + 1);
      expect(ctx.surfaceFills.at(-1)).toBe(surface);
    }
  });

  it("redraws a component rendered into an iframe's own document", async () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const frameWindow = frame.contentWindow as unknown as Window & typeof globalThis;
    const frameDoc = frame.contentDocument!;
    canvasStub = installFakeCanvas(frameWindow);
    const mount = frameDoc.createElement("div");
    mount.style.setProperty("--stoa-color-surface", "rgb(31, 31, 31)");
    frameDoc.body.append(mount);
    // The iframe is another realm, so its nodes fail `instanceof Node`
    // against this realm's constructor: the check that decides whether a
    // signal's target is an ancestor cannot use `instanceof`.
    expect(mount instanceof Node).toBe(false);

    const ref = createRef<LadderHandle>();
    const root = createRoot(mount);
    try {
      await act(async () => root.render(<Ladder ref={ref} label="Book" />));
      const canvas = frameDoc.querySelector("canvas")!;
      act(() => ref.current!.draw(sampleBook()));
      const ctx = canvasStub.contexts.get(canvas)!;
      expect(ctx.surfaceFills.at(-1)).toBe("rgb(31, 31, 31)");
      const before = ctx.draws;

      mount.style.setProperty("--stoa-color-surface", "rgb(32, 32, 32)");
      act(() => signalTokensChanged(mount));

      expect(ctx.draws).toBe(before + 1);
      expect(ctx.surfaceFills.at(-1)).toBe("rgb(32, 32, 32)");
    } finally {
      await act(async () => root.unmount());
      frame.remove();
    }
  });

  it("keeps the tokensVersion prop working as an alternative to the event", () => {
    canvasStub = installFakeCanvas();
    const ref = createRef<LadderHandle>();
    const { container, rerender } = render(
      <Themed surface="rgb(5, 5, 5)">
        <Ladder ref={ref} label="Book" tokensVersion={0} />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    act(() => ref.current!.draw(sampleBook()));
    const ctx = canvasStub.contexts.get(canvas)!;

    wrapper.style.setProperty("--stoa-color-surface", "rgb(6, 6, 6)");
    act(() => rerender(
      <Themed surface="rgb(6, 6, 6)">
        <Ladder ref={ref} label="Book" tokensVersion={1} />
      </Themed>,
    ));

    expect(ctx.surfaceFills.at(-1)).toBe("rgb(6, 6, 6)");
  });

  it("draws a Ladder once, with fresh tokens, when tokensVersion changes with data set", () => {
    canvasStub = installFakeCanvas();
    const book = sampleBook();
    const { container, rerender } = render(
      <Themed surface="rgb(41, 41, 41)">
        <Ladder label="Book" data={book} tokensVersion={0} />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    const ctx = canvasStub.contexts.get(canvas)!;
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(41, 41, 41)");
    const draws = ctx.draws;
    const fills = ctx.surfaceFills.length;

    wrapper.style.setProperty("--stoa-color-surface", "rgb(42, 42, 42)");
    act(() => rerender(
      <Themed surface="rgb(42, 42, 42)">
        <Ladder label="Book" data={book} tokensVersion={1} />
      </Themed>,
    ));

    // One draw, with the new value: not a stale draw followed by a fresh one.
    expect(ctx.draws).toBe(draws + 1);
    expect(ctx.surfaceFills.slice(fills)).toEqual(["rgb(42, 42, 42)"]);
  });

  it("draws a Heatmap once, with fresh tokens, when tokensVersion changes with data set", () => {
    canvasStub = installFakeCanvas();
    const cells = sampleHeatmap(4, 4);
    const { container, rerender } = render(
      <Themed surface="rgb(51, 51, 51)">
        <Heatmap label="Liquidity" height={80} data={cells} tokensVersion={0} />
      </Themed>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    const ctx = canvasStub.contexts.get(canvas)!;
    expect(ctx.surfaceFills.at(-1)).toBe("rgb(51, 51, 51)");
    const draws = ctx.draws;
    const fills = ctx.surfaceFills.length;

    wrapper.style.setProperty("--stoa-color-surface", "rgb(52, 52, 52)");
    act(() => rerender(
      <Themed surface="rgb(52, 52, 52)">
        <Heatmap label="Liquidity" height={80} data={cells} tokensVersion={1} />
      </Themed>,
    ));

    expect(ctx.draws).toBe(draws + 1);
    expect(ctx.surfaceFills.slice(fills)).toEqual(["rgb(52, 52, 52)"]);
  });
});
