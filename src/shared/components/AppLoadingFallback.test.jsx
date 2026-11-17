// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AppLoadingFallback from "./AppLoadingFallback";

afterEach(cleanup);

describe("AppLoadingFallback tracker", () => {
  it("uses placeholders instead of difficulty and solved labels", () => {
    const { container } = render(<AppLoadingFallback />);
    const progressCard = container.querySelector(".sk-side-card");

    expect(progressCard.textContent).not.toMatch(/\b(Easy|Medium|Hard|Solved)\b|Med\./);
    expect(progressCard.querySelectorAll(".sk-difficulty-box")).toHaveLength(3);
    expect(progressCard.querySelectorAll(".sk-difficulty-box .sk-bar")).toHaveLength(6);
  });
});
