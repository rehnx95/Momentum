// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedbackButton from "./FeedbackButton";

describe("FeedbackButton", () => {
  it("opens a pre-addressed Gmail draft with a custom tooltip", () => {
    render(<FeedbackButton />);

    const link = screen.getByRole("link", { name: "Send feedback by email" });
    expect(link.getAttribute("href")).toBe(
      "https://mail.google.com/mail/u/0/?view=cm&fs=1&to=rehan95378@gmail.com&su=Momentum%20feedback",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.hasAttribute("title")).toBe(false);
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.parentElement.className).toContain("feedback-button-anchor");
    expect(link.parentElement.className).toContain("feedback-button-floating");

    const originalInnerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    vi.spyOn(link.parentElement, "getBoundingClientRect").mockReturnValue({
      top: 90,
      left: 280,
      width: 48,
      height: 48,
    });
    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    vi.spyOn(tooltip, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      width: 140,
      height: 24,
    });
    fireEvent.mouseEnter(link.parentElement);
    expect(screen.getByRole("tooltip")).toBe(tooltip);
    expect(tooltip.textContent).toBe("Send feedback");
    expect(tooltip.classList.contains("app-tooltip-portal")).toBe(true);
    expect(tooltip.classList.contains("app-tooltip-visible")).toBe(true);
    expect(Number.parseFloat(tooltip.style.top)).toBeLessThan(90);
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(tooltip.style.left) + 140).toBeLessThanOrEqual(312);
    if (originalInnerWidth) Object.defineProperty(window, "innerWidth", originalInnerWidth);
  });

  it("supports an inline header placement for mobile", () => {
    const { container } = render(<FeedbackButton placement="header" />);

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link.parentElement.className).toContain("feedback-button-header");
    expect(link.className).toBe("icon-btn");
    expect(link.getAttribute("href")).toBe(
      "https://mail.google.com/mail/u/0/?view=cm&fs=1&to=rehan95378@gmail.com&su=Momentum%20feedback",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.querySelector("svg").getAttribute("width")).toBe("18");
  });
});
