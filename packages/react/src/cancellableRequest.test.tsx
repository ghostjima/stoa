// @vitest-environment jsdom
// CancellableRequest: the request button, its confirmation, the recorded
// state with Cancel, the closed state, the focus after each step and the
// locale's words.
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CancellableRequest, I18nProvider, type CancellableRequestProps } from "./index";

afterEach(() => cleanup());

function pressWithKeyboard(element: HTMLElement) {
  act(() => element.focus());
  fireEvent.keyDown(element, { key: "Enter" });
  fireEvent.keyUp(element, { key: "Enter" });
}

function Request(props: Partial<CancellableRequestProps> & { initial?: boolean }) {
  const { initial = false, onRequest, onCancel, ...rest } = props;
  const [isRequested, setRequested] = useState(initial);
  return (
    <CancellableRequest
      isRequested={isRequested}
      requestLabel="Request redemption"
      confirmTitle="Redeem at the offer?"
      confirmLabel="Request"
      onRequest={() => {
        onRequest?.();
        setRequested(true);
      }}
      recordedText="Requested: 40 bonds."
      onCancel={() => {
        onCancel?.();
        setRequested(false);
      }}
      deadline="Requests until 9 October."
      {...rest}
    >
      <p>40 bonds will be offered back to the issuer.</p>
    </CancellableRequest>
  );
}

describe("CancellableRequest", () => {
  it("asks for a confirmation, then shows what was recorded beside Cancel, with the focus on Cancel", async () => {
    const onRequest = vi.fn();
    render(<Request onRequest={onRequest} />);
    pressWithKeyboard(screen.getByRole("button", { name: "Request redemption" }));
    const dialog = screen.getByRole("alertdialog", { name: "Redeem at the offer?" });
    expect(within(dialog).getByText("40 bonds will be offered back to the issuer.")).toBeTruthy();
    // The safe action has the focus, so an Enter by habit does not request.
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onRequest).not.toHaveBeenCalled();
    pressWithKeyboard(within(dialog).getByRole("button", { name: "Request" }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const cancel = screen.getByRole("button", { name: "Cancel request" });
    expect(screen.queryByRole("button", { name: "Request redemption" })).toBeNull();
    expect(screen.getByText("Requested: 40 bonds.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it("describes Cancel by what was recorded and the deadline, and the request button by the deadline", () => {
    const { unmount } = render(<Request />);
    const request = screen.getByRole("button", { name: "Request redemption" });
    expect(request.getAttribute("aria-describedby")?.split(" ").map((id) => document.getElementById(id)?.textContent)).toEqual(["Requests until 9 October."]);
    unmount();
    render(<Request initial />);
    const cancel = screen.getByRole("button", { name: "Cancel request" });
    expect(cancel.getAttribute("aria-describedby")?.split(" ").map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Requested: 40 bonds.",
      "Requests until 9 October.",
    ]);
  });

  it("cancels a recorded request at once and puts the focus back on the request button", async () => {
    const onCancel = vi.fn();
    render(<Request initial onCancel={onCancel} />);
    pressWithKeyboard(screen.getByRole("button", { name: "Cancel request" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    const request = screen.getByRole("button", { name: "Request redemption" });
    await waitFor(() => expect(document.activeElement).toBe(request));
    expect(screen.queryByText("Requested: 40 bonds.")).toBeNull();
  });

  it("records nothing when the confirmation is declined", async () => {
    const onRequest = vi.fn();
    render(<Request onRequest={onRequest} />);
    pressWithKeyboard(screen.getByRole("button", { name: "Request redemption" }));
    pressWithKeyboard(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Request redemption" })).toBeTruthy();
  });

  it("says requests are closed in place of the buttons, in the caller's words or the locale's", () => {
    const { unmount } = render(<Request isClosed initial />);
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.getByText("Requests are closed.")).toBeTruthy();
    expect(screen.getByText("Requests until 9 October.")).toBeTruthy();
    unmount();
    render(<Request isClosed closedText="The offer window has closed." />);
    expect(screen.getByText("The offer window has closed.")).toBeTruthy();
  });

  it("writes Cancel and the closed sentence in the locale's words", () => {
    for (const [locale, cancel, closed] of [
      ["ru-RU", "Отменить заявку", "Приём заявок закрыт."],
      ["ar-u-nu-arab", "إلغاء الطلب", "انتهت فترة تقديم الطلبات."],
    ] as const) {
      const { unmount } = render(
        <I18nProvider locale={locale}>
          <Request initial />
        </I18nProvider>,
      );
      expect(screen.getByRole("button", { name: cancel })).toBeTruthy();
      unmount();
      render(
        <I18nProvider locale={locale}>
          <Request isClosed />
        </I18nProvider>,
      );
      expect(screen.getByText(closed)).toBeTruthy();
      cleanup();
    }
  });
});
