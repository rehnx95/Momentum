// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  onAuthStateChange: vi.fn(),
  authCallback: null,
}));

vi.mock("../../shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: authMocks.from,
  },
}));

vi.mock("../../shared/lib/preload", () => ({
  preconnectBackend: vi.fn(),
}));

import useAuthentication, { AppState } from "./useAuthentication";

describe("useAuthentication", () => {
  const cachedProfile = {
    id: "user-1",
    name: "Test User",
    username: "test-user",
    onboarding_completed: true,
  };

  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    localStorage.clear();
    authMocks.getSession.mockReset();
    authMocks.onAuthStateChange.mockReset();
    authMocks.from.mockReset();
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authMocks.authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    authMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: cachedProfile, error: null }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("keeps a cached sign-in when restoring the session temporarily fails", async () => {
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({
        user: { id: cachedProfile.id, email: "test@example.com" },
        profile: cachedProfile,
      }),
    );
    authMocks.getSession.mockRejectedValue(new Error("Network unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAuthentication());

    await waitFor(() =>
      expect(result.current.authError).toBe("Could not restore your session. Please refresh and try again."),
    );

    expect(result.current.appState).toBe(AppState.AUTHENTICATED);
    expect(result.current.user.id).toBe(cachedProfile.id);
    expect(localStorage.getItem("momentum:account-cache")).not.toBeNull();

    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: cachedProfile.id, email: "test@example.com" } } },
      error: null,
    });
    await act(async () => {
      result.current.retryAuthentication();
    });

    await waitFor(() => expect(result.current.authError).toBe(""));
    expect(authMocks.getSession).toHaveBeenCalledTimes(2);
  });

  it("keeps a valid session and offers a retry when the profile request fails", async () => {
    const user = { id: "user-2", email: "other@example.com" };
    localStorage.setItem("sb-example-auth-token", "{}");
    authMocks.getSession.mockResolvedValue({ data: { session: { user } }, error: null });
    authMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Network unavailable"),
      }),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAuthentication());

    await waitFor(() =>
      expect(result.current.authError).toContain("Could not load your profile."),
    );

    expect(result.current.appState).toBe(AppState.LOADING);
    expect(result.current.user.id).toBe(user.id);
    expect(result.current.retryAuthentication).toEqual(expect.any(Function));
  });

  it("clears the cached account after an explicit sign-out event", async () => {
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({
        user: { id: cachedProfile.id, email: "test@example.com" },
        profile: cachedProfile,
      }),
    );
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: cachedProfile.id, email: "test@example.com" } } },
      error: null,
    });

    const { result } = renderHook(() => useAuthentication());
    await waitFor(() => expect(authMocks.authCallback).toEqual(expect.any(Function)));

    await act(async () => {
      authMocks.authCallback("SIGNED_OUT", null);
    });

    expect(result.current.appState).toBe(AppState.UNAUTHENTICATED);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("momentum:account-cache")).toBeNull();
  });
});
