import { useCallback, useEffect, useRef, useState } from "react";
import { preconnectBackend } from "../../shared/lib/preload";

export const AppState = {
  LOADING: "LOADING",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ONBOARDING: "ONBOARDING",
  AUTHENTICATED: "AUTHENTICATED",
};

const ACCOUNT_CACHE_KEY = "momentum:account-cache";
const profileRequests = new Map();
let supabaseModulePromise;

function hasSupabaseConfiguration() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

function loadSupabaseModule() {
  if (!supabaseModulePromise) {
    const request = import("../../shared/lib/supabase");
    supabaseModulePromise = request.catch((error) => {
      supabaseModulePromise = undefined;
      throw error;
    });
  }
  return supabaseModulePromise;
}

function hasStoredSession() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code") || url.hash.includes("access_token")) return true;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function clearAppScopedStorage() {
  try {
    const keysToRemove = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      // These records must survive account cleanup so queued edits can sync after sign-in.
      const isDurableOfflineQueue = key === "momentum:offline-mutations";
      const isBuiltInSyncMarker = key?.startsWith("momentum:builtins:");
      if (key && key.startsWith("momentum:") && !isBuiltInSyncMarker && !isDurableOfflineQueue) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore quota or browser-storage errors during sign-out and account switches.
  }
}

function resetToTrackerRoute() {
  if (window.location.pathname !== "/") {
    window.history.replaceState({}, "", "/");
  }
}

function fetchProfile(userId) {
  const existingRequest = profileRequests.get(userId);
  if (existingRequest) return existingRequest;

  const request = loadSupabaseModule().then(({ supabase }) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    return supabase
      .from("profiles")
      .select("id, name, username, onboarding_completed")
      .eq("id", userId)
      .maybeSingle();
  });
  profileRequests.set(userId, request);
  const clearRequest = () => {
    if (profileRequests.get(userId) === request) profileRequests.delete(userId);
  };
  request.then(clearRequest, clearRequest);
  return request;
}

function readCachedAccount() {
  try {
    const cached = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || "null");
    if (!cached?.user?.id || !cached.profile?.id || cached.profile.id !== cached.user.id) {
      return null;
    }
    const profile = { ...cached.profile };
    delete profile.location;
    delete profile.website;
    return { ...cached, profile };
  } catch {
    return null;
  }
}

export default function useAuthentication() {
  const [cachedAccount] = useState(readCachedAccount);
  const previousUserId = useRef(null);
  const [appState, setAppState] = useState(() => {
    if (!cachedAccount) return hasStoredSession() ? AppState.LOADING : AppState.UNAUTHENTICATED;
    return cachedAccount.profile.onboarding_completed
      ? AppState.AUTHENTICATED
      : AppState.ONBOARDING;
  });
  const [user, setUser] = useState(cachedAccount?.user || null);
  const [profile, setProfile] = useState(cachedAccount?.profile || null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [authRetryCount, setAuthRetryCount] = useState(0);
  const authEventOccurred = useRef(false);
  const loadedProfileUserId = useRef(null);
  const userId = user?.id;
  const hasCachedProfile = profile?.id === userId;

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError) {
      setAuthError(
        oauthError === "server_error"
          ? "Google sign-in failed while creating your account. Please apply the latest Supabase database migration and try again."
          : "Google sign-in could not be completed. Please try again.",
      );
    }

    if (userId && previousUserId.current && previousUserId.current !== userId) {
      clearAppScopedStorage();
    }
    if (userId) previousUserId.current = userId;

    if (!hasSupabaseConfiguration()) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the app.",
      );
      setAppState(AppState.UNAUTHENTICATED);
      return undefined;
    }

    preconnectBackend();
    let active = true;
    let subscription;
    loadSupabaseModule()
      .then(({ supabase }) => {
        if (!active) return null;
        if (!supabase) throw new Error("Supabase is not configured.");
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active || event === "INITIAL_SESSION") return;
          if (event === "TOKEN_REFRESHED") {
            setAuthError("");
            return;
          }
          if (session?.user) {
            authEventOccurred.current = true;
            setAuthError("");
            const hasCachedProfileForSession =
              cachedAccount?.user.id === session.user.id &&
              cachedAccount.profile.id === session.user.id;
            if (
              loadedProfileUserId.current !== session.user.id &&
              !hasCachedProfileForSession
            ) {
              setAppState(AppState.LOADING);
            }
            setUser(session.user);
            return;
          }
          if (event !== "SIGNED_OUT") return;
          authEventOccurred.current = true;
          setAuthError("");
          loadedProfileUserId.current = null;
          resetToTrackerRoute();
          setUser(null);
          clearAppScopedStorage();
          localStorage.removeItem(ACCOUNT_CACHE_KEY);
          setProfile(null);
          setAppState(AppState.UNAUTHENTICATED);
        });
        subscription = authSubscription;
        return supabase.auth.getSession();
      })
      .then((result) => {
        if (!active || !result || authEventOccurred.current) return;
        const {
          data: { session },
          error,
        } = result;
        if (error) throw error;
        setAuthError("");
        setUser(session?.user ?? null);
        if (!session) {
          loadedProfileUserId.current = null;
          clearAppScopedStorage();
          localStorage.removeItem(ACCOUNT_CACHE_KEY);
          setProfile(null);
          setAppState(AppState.UNAUTHENTICATED);
        }
      })
      .catch((error) => {
        if (!active || authEventOccurred.current) return;
        console.error("Failed to restore authentication session:", error);
        setAuthError("Could not restore your session. Please refresh and try again.");
        if (!cachedAccount && !userId && !hasStoredSession()) {
          setAppState(AppState.UNAUTHENTICATED);
        }
      });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [authRetryCount, cachedAccount, userId]);

  useEffect(() => {
    if (
      !userId ||
      !hasSupabaseConfiguration() ||
      loadedProfileUserId.current === userId
    ) {
      return undefined;
    }

    let active = true;
    if (!hasCachedProfile) setAppState(AppState.LOADING);
    fetchProfile(userId)
      .then(({ data: profileData, error }) => {
        if (!active) return;
        if (error) throw error;
        loadedProfileUserId.current = userId;
        setProfile(profileData);
        if (!profileData) localStorage.removeItem(ACCOUNT_CACHE_KEY);
        setAppState(
          profileData?.onboarding_completed ? AppState.AUTHENTICATED : AppState.ONBOARDING,
        );
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to fetch profile:", error);
        setAuthError(
          "Could not load your profile. Check the Supabase database setup and try again.",
        );
      });

    return () => {
      active = false;
    };
  }, [authRetryCount, userId, hasCachedProfile]);

  useEffect(() => {
    if (!user || profile?.id !== user.id) return;
    localStorage.setItem(
      ACCOUNT_CACHE_KEY,
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
        profile,
      }),
    );
  }, [profile, user]);

  const handleSignIn = async () => {
    if (!hasSupabaseConfiguration()) return;
    setIsSigningIn(true);
    setAuthAction("google");
    setAuthError("");
    try {
      preconnectBackend();
      const { supabase } = await loadSupabaseModule();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setAuthError(
        "Google sign-in could not be started. Check the Google provider settings in Supabase and try again.",
      );
      setIsSigningIn(false);
      setAuthAction(null);
    }
  };

  const handlePasswordSignIn = async (identifier, password) => {
    if (!hasSupabaseConfiguration()) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then redeploy the app.",
      );
      return false;
    }
    setIsSigningIn(true);
    setAuthAction("password");
    setAuthError("");
    try {
      preconnectBackend();
      const { supabase } = await loadSupabaseModule();
      if (!supabase) throw new Error("Supabase is not configured.");

      if (identifier.includes("@")) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Sign-in did not return an authenticated user.");
        setAppState(AppState.LOADING);
        setUser(data.user);
      } else {
        const response = await fetch("/api/auth/username-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier, password }),
        });
        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error(
            "Username sign-in API is unavailable. Run `npx vercel dev` locally and configure SUPABASE_SERVICE_ROLE_KEY.",
          );
        }
        if (!response.ok) {
          setAuthError(result.error || "Could not sign in. Please try again.");
          return false;
        }
        if (!result.session?.access_token || !result.session?.refresh_token) {
          throw new Error("Username sign-in returned an invalid session.");
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Sign-in did not return an authenticated user.");
        setAppState(AppState.LOADING);
        setUser(data.user);
      }

      return true;
    } catch (error) {
      console.error("Password sign-in failed:", error);
      setAuthError(error.message || "Could not sign in. Please try again.");
      return false;
    } finally {
      setIsSigningIn(false);
      setAuthAction(null);
    }
  };

  const handleSignUp = async (email, password) => {
    if (!hasSupabaseConfiguration()) return null;
    setIsSigningIn(true);
    setAuthAction("sign-up");
    setAuthError("");
    try {
      preconnectBackend();
      const { supabase } = await loadSupabaseModule();
      if (!supabase) throw new Error("Supabase is not configured.");
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(
          "Email sign-up API is unavailable. Run `npx vercel dev` locally and configure SUPABASE_SERVICE_ROLE_KEY.",
        );
      }
      if (!response.ok) {
        setAuthError(result.error || "Could not create the account. Please try again.");
        return null;
      }
      if (!result.session?.access_token || !result.session?.refresh_token) {
        throw new Error("Email sign-up returned an invalid session.");
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Sign-up did not return an authenticated user.");
      setAppState(AppState.LOADING);
      setUser(data.user);
      return true;
    } catch (error) {
      console.error("Email sign-up failed:", error);
      setAuthError(error.message || "Could not create your account. Please try again.");
      return null;
    } finally {
      setIsSigningIn(false);
      setAuthAction(null);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      if (!hasSupabaseConfiguration()) return;
      const { supabase } = await loadSupabaseModule();
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      loadedProfileUserId.current = null;
      resetToTrackerRoute();
      clearAppScopedStorage();
      localStorage.removeItem(ACCOUNT_CACHE_KEY);
      previousUserId.current = null;
      setUser(null);
      setProfile(null);
      setAppState(AppState.UNAUTHENTICATED);
    } catch (error) {
      console.error("Sign out error:", error);
      setAuthError("Could not sign out. Please try again.");
    }
  }, []);
  const retryAuthentication = useCallback(() => {
    setAuthError("");
    setAuthRetryCount((current) => current + 1);
  }, []);
  const clearAuthError = useCallback(() => setAuthError(""), []);

  return {
    appState,
    authAction,
    authError,
    clearAuthError,
    handleSignIn,
    handlePasswordSignIn,
    handleSignUp,
    handleSignOut,
    isSigningIn,
    profile,
    retryAuthentication,
    setAppState,
    setProfile,
    user,
  };
}
