// @vitest-environment jsdom

import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const profilePageMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("../profile/pages/ProfilePage", () => ({
  default: profilePageMock,
}));

import AuthenticatedScreens from "./AuthenticatedScreens";

describe("AuthenticatedScreens profile context", () => {
  it("passes DSA restore controls through to the Profile page", async () => {
    const restoreDsaSheet = vi.fn();
    const context = {
      showProfile: true,
      renderDialog: vi.fn(() => null),
      restoreDsaSheet,
      restoringDsaSheet: false,
      customSheetsLoading: false,
      progressLoading: false,
    };
    let renderer;

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(AuthenticatedScreens, { context }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(profilePageMock.mock.calls[0][0].context).toMatchObject({
      restoreDsaSheet,
      restoringDsaSheet: false,
      customSheetsLoading: false,
      progressLoading: false,
    });

    act(() => renderer.unmount());
  });
});
