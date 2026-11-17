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
      if (key && key.startsWith("momentum:")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore quota or browser-storage errors during sign-out and account switches.
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

    if (!cachedAccount && !hasStoredSession()) {
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
            setUser(session.user);
            return;
          }
          if (event !== "SIGNED_OUT") return;
          authEventOccurred.current = true;
          setAuthError("");
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
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      if (!hasSupabaseConfiguration()) return;
      const { supabase } = await loadSupabaseModule();
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAppScopedStorage();
      localStorage.removeItem(ACCOUNT_CACHE_KEY);
      previousUserId.current = null;
    } catch (error) {
      console.error("Sign out error:", error);
      setAuthError("Could not sign out. Please try again.");
    }
  }, []);
  const retryAuthentication = useCallback(() => {
    setAuthError("");
    setAuthRetryCount((current) => current + 1);
  }, []);

  return {
    appState,
    authError,
    handleSignIn,
    handleSignOut,
    isSigningIn,
    profile,
    retryAuthentication,
    setAppState,
    setProfile,
    user,
  };
}
