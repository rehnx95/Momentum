// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildHeatmap } from "../../features/activity/utils/heatmap";
import { getLocalDateKey } from "../utils/date";
import AppLoadingFallback from "./AppLoadingFallback";

afterEach(cleanup);

describe("AppLoadingFallback tracker", () => {
  it("uses the authentication skeleton while the session is loading", () => {
    const previousPath = window.location.pathname;
    window.history.replaceState({}, "", "/profile");

    try {
      const { container } = render(<AppLoadingFallback auth />);

      expect(container.querySelector(".sk-auth-card")).not.toBeNull();
      expect(container.querySelector(".sk-profile")).toBeNull();
      expect(container.querySelectorAll(".sk-auth-input")).toHaveLength(2);
    } finally {
      window.history.replaceState({}, "", previousPath);
    }
  });

  it("uses the profile setup card layout while onboarding loads", () => {
    const { container } = render(<AppLoadingFallback setup />);

    expect(container.querySelector(".sk-setup .sk-auth-card")).not.toBeNull();
    expect(container.querySelectorAll(".sk-setup .sk-auth-input")).toHaveLength(2);
    expect(container.querySelector(".sk-setup-username-status")).not.toBeNull();
    expect(container.querySelector(".sk-setup .sk-auth-tabs")).toBeNull();
    expect(container.querySelector(".sk-setup .sk-auth-google")).toBeNull();
  });

  it("uses placeholders instead of difficulty and solved labels", () => {
    const { container } = render(<AppLoadingFallback />);
    const progressCard = container.querySelector(".sk-side-card");

    expect(progressCard.textContent).not.toMatch(/\b(Easy|Medium|Hard|Solved)\b|Med\./);
    expect(progressCard.querySelectorAll(".sk-difficulty-box")).toHaveLength(3);
    expect(progressCard.querySelectorAll(".sk-difficulty-box .sk-bar")).toHaveLength(6);
  });

  it("matches the profile skeleton heatmap and sheet actions to the real layout", () => {
    const previousPath = window.location.pathname;
    window.history.replaceState({}, "", "/profile");

    try {
      const { container } = render(<AppLoadingFallback />);
      const heat = buildHeatmap({ todayKey: getLocalDateKey() });

      expect(container.querySelectorAll(".sk-heat-grid .sk-heat-cell")).toHaveLength(
        heat.weeks.flat().length,
      );
      expect(container.querySelector(".sk-heat-months").children).toHaveLength(heat.columns);
      expect(container.querySelectorAll(".sk-sheet-actions .sk-bar")).toHaveLength(4);
    } finally {
      window.history.replaceState({}, "", previousPath);
    }
  });

  it("matches the profile edit skeleton to the real form layout", () => {
    const previousPath = window.location.pathname;
    window.history.replaceState({}, "", "/profile/edit");

    try {
      const { container } = render(<AppLoadingFallback />);
      const settings = container.querySelector(".sk-settings");

      expect(settings.querySelector(".sk-back")).not.toBeNull();
      expect(settings.querySelector(".sk-settings-description")).not.toBeNull();
      expect(settings.querySelectorAll(".sk-field")).toHaveLength(2);
      expect(settings.querySelector(".sk-settings-help")).not.toBeNull();
      expect(settings.querySelector(".sk-submit")).not.toBeNull();
    } finally {
      window.history.replaceState({}, "", previousPath);
    }
  });
});
