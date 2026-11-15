// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SleepStudyGraph } from "./SleepStudyChart";

describe("SleepStudyGraph", () => {
  it("positions the tooltip at the hovered point", () => {
    const rectSpy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        if (this.classList?.contains("sleep-study-chart-wrap")) {
          return { left: 100, top: 200, width: 320, height: 220 };
        }
        if (this.hasAttribute?.("data-tip")) {
          return { left: 225, top: 260, width: 10, height: 10 };
        }
        return { left: 0, top: 0, width: 0, height: 0 };
      });

    try {
      const { container } = render(
        <SleepStudyGraph
          days={[{ dateKey: "2025-01-01", label: "Jan 1", study: 60 }]}
          title="Study hours"
          series={["study"]}
          seriesLabels={{ study: "Study" }}
        />,
      );
      fireEvent.mouseOver(container.querySelector('[data-point="study:2025-01-01"]'));

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.parentElement).toBe(document.body);
      expect(tooltip.classList.contains("sleep-study-tooltip")).toBe(true);
      expect(tooltip.style.left).toBe("230px");
      expect(tooltip.style.top).toBe("260px");
    } finally {
      rectSpy.mockRestore();
    }
  });
});
