// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { adjustTimeSegment, navigateTimeSegments } from "./TimeInput";
import TimeInput from "./TimeInput";

afterEach(cleanup);

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

  it("auto-advances across all four slot segments and leaves the end minute focused", () => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    render(
      createElement(
        "div",
        { className: "slot-time-range" },
        createElement(TimeInput, {
          label: "Start time",
          value: "",
          onChange: onStartChange,
          showPlaceholder: true,
        }),
        createElement(TimeInput, {
          label: "End time",
          value: "",
          onChange: onEndChange,
          showPlaceholder: true,
        }),
      ),
    );
    const startHour = screen.getByRole("textbox", { name: "Start time hour" });
    const startMinute = screen.getByRole("textbox", { name: "Start time minute" });
    const endHour = screen.getByRole("textbox", { name: "End time hour" });
    const endMinute = screen.getByRole("textbox", { name: "End time minute" });

    fireEvent.change(startHour, { target: { value: "09" } });
    expect(document.activeElement).toBe(startMinute);
    fireEvent.change(startMinute, { target: { value: "30" } });
    expect(document.activeElement).toBe(endHour);
    fireEvent.change(endHour, { target: { value: "10" } });
    expect(document.activeElement).toBe(endMinute);
    fireEvent.change(endMinute, { target: { value: "45" } });

    expect(document.activeElement).toBe(endMinute);
    expect(onEndChange).toHaveBeenLastCalledWith("10:45");
  });

  it("auto-advances across the sleep time segments", () => {
    const onSleepChange = vi.fn();
    const onWakeChange = vi.fn();
    render(
      createElement(
        "div",
        { className: "daily-sleep-time-range" },
        createElement(TimeInput, {
          label: "Sleep time",
          value: "",
          onChange: onSleepChange,
          showPlaceholder: true,
        }),
        createElement(TimeInput, {
          label: "Wake time",
          value: "",
          onChange: onWakeChange,
          showPlaceholder: true,
        }),
      ),
    );
    const sleepHour = screen.getByRole("textbox", { name: "Sleep time hour" });
    const sleepMinute = screen.getByRole("textbox", { name: "Sleep time minute" });
    const wakeHour = screen.getByRole("textbox", { name: "Wake time hour" });

    fireEvent.change(sleepHour, { target: { value: "22" } });
    expect(document.activeElement).toBe(sleepMinute);
    fireEvent.change(sleepMinute, { target: { value: "30" } });
    expect(document.activeElement).toBe(wakeHour);
    expect(onSleepChange).toHaveBeenLastCalledWith("22:30");
  });

  it("commits the current time when Enter is pressed", () => {
    const onChange = vi.fn();
    const onSaveNow = vi.fn();
    render(
      createElement(TimeInput, {
        label: "Start time",
        value: "09:30",
        onChange,
        onSaveNow,
      }),
    );

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Start time minute" }), {
      key: "Enter",
    });

    expect(onChange).toHaveBeenCalledWith("09:30");
    expect(onSaveNow).toHaveBeenCalledOnce();
  });
});
