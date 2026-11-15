// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppDialog from "./AppDialog";

describe("AppDialog", () => {
  it("focuses the confirmation input and keeps keyboard focus inside the dialog", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <AppDialog
        dialog={{
          title: "Delete sheet",
          message: "This action cannot be undone.",
          type: "confirm",
          dangerous: true,
          requireWord: "DELETE",
        }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    const input = screen.getByLabelText("Type “DELETE” to confirm.");
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Reset" });

    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(confirmButton, { key: "Tab" });
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "DELETE" } });
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(cancelButton).not.toBeNull();
  });
});
