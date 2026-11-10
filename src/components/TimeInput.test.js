import { describe, expect, it, vi } from "vitest";
import {
  adjustTimeSegment,
  navigateTimeSegments,
} from "./TimeInput";

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

describe("segmented time input keyboard controls", () => {
  it("moves through hour, minute, and the next time's hour", () => {
    const hour = { focus: vi.fn(), select: vi.fn() };
    const minute = { focus: vi.fn(), select: vi.fn() };
    const nextHour = { focus: vi.fn(), select: vi.fn() };
    const inputs = [hour, minute, nextHour];
    const event = createKeyEvent("ArrowRight", inputs, minute);

    navigateTimeSegments(event);

    expect(nextHour.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(nextHour.select).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("moves back through the same segments with the left arrow", () => {
    const hour = { focus: vi.fn(), select: vi.fn() };
    const minute = { focus: vi.fn(), select: vi.fn() };
    const event = createKeyEvent("ArrowLeft", [hour, minute], minute);

    navigateTimeSegments(event);

    expect(hour.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(hour.select).toHaveBeenCalledOnce();
  });

  it("increments and wraps hour and minute segments with up and down", () => {
    expect(adjustTimeSegment("09", "hour", 1)).toBe("10");
    expect(adjustTimeSegment("00", "hour", -1)).toBe("23");
    expect(adjustTimeSegment("59", "minute", 1)).toBe("00");
    expect(adjustTimeSegment("00", "minute", -1)).toBe("59");
  });
});
