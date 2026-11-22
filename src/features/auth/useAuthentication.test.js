// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  setSession: vi.fn(),
  signInWithPassword: vi.fn(),
  authCallback: null,
}));

vi.mock("../../shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signUp: authMocks.signUp,
      setSession: authMocks.setSession,
      signInWithPassword: authMocks.signInWithPassword,
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
    authMocks.signUp.mockReset();
    authMocks.from.mockReset();
    authMocks.setSession.mockReset();
    authMocks.signInWithPassword.mockReset();
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
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
    vi.unstubAllGlobals();
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

  it("uses the cached profile offline and retries loading it when connectivity returns", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({ user, profile: cachedProfile }),
    );
    authMocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });
    vi.stubGlobal("navigator", { onLine: false });

    const { result } = renderHook(() => useAuthentication());

    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
    expect(result.current.authError).toBe("");
    expect(authMocks.from).not.toHaveBeenCalled();

    await act(async () => {
      navigator.onLine = true;
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(authMocks.from).toHaveBeenCalledTimes(1));
    expect(result.current.authError).toBe("");
  });

  it("clears the cached account after an explicit sign-out event", async () => {
    const previousPath = window.location.pathname;
    window.history.replaceState({}, "", "/profile/edit");
    try {
      localStorage.setItem(
        "momentum:account-cache",
        JSON.stringify({
          user: { id: cachedProfile.id, email: "test@example.com" },
          profile: cachedProfile,
        }),
      );
      localStorage.setItem(`momentum:builtins:${cachedProfile.id}`, "manifest-v1");
      localStorage.setItem(`momentum:user-data:${cachedProfile.id}:progress`, "{}");
      const offlineQueue = JSON.stringify([
        {
          key: `${cachedProfile.id}:progress:problem-1`,
          userId: cachedProfile.id,
          type: "progress",
          entityId: "problem-1",
          payload: { operation: "delete", problemId: "problem-1" },
          updatedAt: 1,
        },
      ]);
      localStorage.setItem("momentum:offline-mutations", offlineQueue);
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
      expect(localStorage.getItem(`momentum:builtins:${cachedProfile.id}`)).toBe("manifest-v1");
      expect(localStorage.getItem(`momentum:user-data:${cachedProfile.id}:progress`)).toBeNull();
      expect(localStorage.getItem("momentum:offline-mutations")).toBe(offlineQueue);
      expect(window.location.pathname).toBe("/");
    } finally {
      window.history.replaceState({}, "", previousPath);
    }
  });

  it("reloads the profile when signing back into the same account", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({ user, profile: cachedProfile }),
    );
    authMocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user },
      error: null,
    });

    const { result } = renderHook(() => useAuthentication());
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));

    await act(async () => {
      authMocks.authCallback("SIGNED_OUT", null);
    });
    expect(result.current.appState).toBe(AppState.UNAUTHENTICATED);

    await act(async () => {
      expect(await result.current.handlePasswordSignIn("test@example.com", "password123")).toBe(
        true,
      );
    });

    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
    expect(result.current.user).toEqual(user);
  });

  it("keeps the loaded page when Supabase repeats SIGNED_IN for the same user", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({ user, profile: cachedProfile }),
    );
    authMocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });

    const { result } = renderHook(() => useAuthentication());
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));

    await act(async () => {
      authMocks.authCallback("SIGNED_IN", { user });
    });

    expect(result.current.appState).toBe(AppState.AUTHENTICATED);
  });

  it("keeps the cached app visible while the same account profile refreshes", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    let finishProfileRequest;
    const profileRequest = new Promise((resolve) => {
      finishProfileRequest = resolve;
    });
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(profileRequest),
    };
    localStorage.setItem(
      "momentum:account-cache",
      JSON.stringify({ user, profile: cachedProfile }),
    );
    authMocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });
    authMocks.from.mockReturnValue(profileQuery);

    const { result } = renderHook(() => useAuthentication());
    await waitFor(() => expect(authMocks.authCallback).toEqual(expect.any(Function)));
    await waitFor(() => expect(profileQuery.maybeSingle).toHaveBeenCalledOnce());

    await act(async () => {
      authMocks.authCallback("SIGNED_IN", { user });
    });

    expect(result.current.appState).toBe(AppState.AUTHENTICATED);

    await act(async () => {
      finishProfileRequest({ data: cachedProfile, error: null });
      await profileRequest;
    });
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
  });

  it("updates the app after sign-in when no session existed on page load", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    const incompleteProfile = { ...cachedProfile, onboarding_completed: false };
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: incompleteProfile, error: null }),
    });

    const { result } = renderHook(() => useAuthentication());
    await waitFor(() => expect(authMocks.authCallback).toEqual(expect.any(Function)));

    await act(async () => {
      authMocks.authCallback("SIGNED_IN", { user });
    });

    await waitFor(() => expect(result.current.appState).toBe(AppState.ONBOARDING));
    expect(result.current.user.id).toBe(user.id);
    expect(result.current.profile).toEqual(incompleteProfile);
  });

  it("signs in with an email and password through Supabase Auth", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    authMocks.signInWithPassword.mockResolvedValue({
      data: { user },
      error: null,
    });
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handlePasswordSignIn("test@example.com", "password123")).toBe(
        true,
      );
    });

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
    expect(result.current.user).toEqual(user);
  });

  it("reports missing Supabase configuration when email sign-in is attempted", async () => {
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handlePasswordSignIn("test@example.com", "password123")).toBe(
        false,
      );
    });

    expect(result.current.authError).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with a username through the server and sets the returned session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: { access_token: "access-token", refresh_token: "refresh-token" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = { id: cachedProfile.id, email: "test@example.com" };
    authMocks.setSession.mockResolvedValue({ data: { user }, error: null });
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handlePasswordSignIn("rehan", "password123")).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/username-login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "rehan", password: "password123" }),
      }),
    );
    expect(authMocks.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
    expect(result.current.user).toEqual(user);
  });

  it("creates an account through Supabase Auth and uses its session", async () => {
    const user = { id: cachedProfile.id, email: "test@example.com" };
    const session = { access_token: "access-token", refresh_token: "refresh-token" };
    authMocks.signUp.mockResolvedValue({
      data: { user, session },
      error: null,
    });
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handleSignUp("test@example.com", "password123")).toBe(true);
    });

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: { emailRedirectTo: window.location.origin },
    });
    await waitFor(() => expect(result.current.appState).toBe(AppState.AUTHENTICATED));
    expect(result.current.user).toEqual(user);
  });

  it("requires email confirmation when Supabase does not return a session", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: { id: "user-2", email: "test@example.com" }, session: null },
      error: null,
    });
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handleSignUp("test@example.com", "password123")).toBe(
        "confirmation-required",
      );
    });
    expect(result.current.appState).toBe(AppState.UNAUTHENTICATED);
  });

  it("surfaces Supabase sign-up errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Sign-ups are disabled."),
    });
    const { result } = renderHook(() => useAuthentication());

    await act(async () => {
      expect(await result.current.handleSignUp("test@example.com", "password123")).toBeNull();
    });

    expect(result.current.authError).toContain("Sign-ups are disabled");
  });
});
