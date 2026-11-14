import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import useAuthenticatedNavigation from "./useAuthenticatedNavigation";

function installBrowserStub() {
  const location = { pathname: "/" };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location,
      history: {
        pushState: (_state, _title, path) => {
          location.pathname = path;
        },
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });
}

describe("useAuthenticatedNavigation", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("tracks authenticated routes and returns from a public profile", () => {
    installBrowserStub();
    let navigation;

    function HookHarness() {
      navigation = useAuthenticatedNavigation();
      return null;
    }

    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(HookHarness));
    });

    act(() => navigation.navigateTo("/daily-log"));
    expect(navigation.dailyLogPage).toBe(true);

    act(() => navigation.openPublicProfile("Rehan"));
    expect(navigation.selectedPublicUsername).toBe("rehan");

    act(() => navigation.returnFromPublicProfile());
    expect(navigation.peopleSearchPage).toBe(true);
    expect(window.location.pathname).toBe("/people");

    act(() => renderer.unmount());
  });
});
