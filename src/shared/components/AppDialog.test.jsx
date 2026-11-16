// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import AppDialog from "./AppDialog";

afterEach(cleanup);

function DialogHarness({ dialog }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <AppDialog
          dialog={dialog}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe("AppDialog", () => {
  it("traps tab focus and restores focus to its trigger after Escape", () => {
    render(
      <DialogHarness
        dialog={{ type: "confirm", title: "Confirm", message: "Continue?" }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Continue" });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on an outside press and restores focus", () => {
    render(
      <DialogHarness
        dialog={{ type: "confirm", title: "Confirm", message: "Continue?" }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    const backdrop = screen.getByRole("alertdialog").parentElement;
    fireEvent.mouseDown(backdrop, { target: backdrop });

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
