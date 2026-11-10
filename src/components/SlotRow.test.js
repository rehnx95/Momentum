import { describe, expect, it, vi } from "vitest";
import { navigateTimeFields } from "./SlotRow";

function createKeyEvent(key, inputs, currentTarget) {
  const view = {
    querySelectorAll: vi.fn(() => inputs),
  };
  currentTarget.closest = vi.fn(() => view);
  return {
    key,
    currentTarget,
    preventDefault: vi.fn(),
    view,
  };
}

describe("time field keyboard navigation", () => {
  it("moves to the next time field with the right arrow", () => {
    const previous = { focus: vi.fn() };
    const current = { focus: vi.fn() };
    const next = { focus: vi.fn() };
    const event = createKeyEvent("ArrowRight", [previous, current, next], current);

    navigateTimeFields(event);

    expect(next.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("moves to the previous time field with the left arrow", () => {
    const previous = { focus: vi.fn() };
    const current = { focus: vi.fn() };
    const next = { focus: vi.fn() };
    const event = createKeyEvent("ArrowLeft", [previous, current, next], current);

    navigateTimeFields(event);

    expect(previous.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("leaves up and down arrows to the native time input", () => {
    const current = { closest: vi.fn(), focus: vi.fn() };
    const event = {
      key: "ArrowUp",
      currentTarget: current,
      preventDefault: vi.fn(),
    };

    navigateTimeFields(event);

    expect(current.closest).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
