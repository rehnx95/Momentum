import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import useAuthenticatedNavigation from "./useAuthenticatedNavigation";

function installBrowserStub() {
  const location = { pathname: "/" };
  const documentMeta = {
    title: "Momentum",
    head: {
      appendChild: () => {},
    },
    querySelector: () => null,
    createElement: () => ({
      setAttribute: () => {},
    }),
  };
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
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentMeta,
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
    expect(document.title).toBe("Daily Log • Momentum");

    act(() => navigation.openPublicProfile("Rehan"));
    expect(navigation.selectedPublicUsername).toBe("rehan");
    expect(document.title).toBe("Rehan • Momentum");

    act(() => navigation.returnFromPublicProfile());
    expect(navigation.peopleSearchPage).toBe(true);
    expect(window.location.pathname).toBe("/people");

    act(() => renderer.unmount());
  });
});
