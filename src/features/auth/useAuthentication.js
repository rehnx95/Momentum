import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../shared/lib/supabase";

export const AppState = {
  LOADING: "LOADING",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ONBOARDING: "ONBOARDING",
  AUTHENTICATED: "AUTHENTICATED",
};

const ACCOUNT_CACHE_KEY = "momentum:account-cache";

function readCachedAccount() {
  try {
    const cached = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || "null");
    if (
      !cached?.user?.id ||
      !cached.profile?.id ||
      cached.profile.id !== cached.user.id
    ) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

export default function useAuthentication() {
  const [cachedAccount] = useState(readCachedAccount);
  const [appState, setAppState] = useState(() => {
    if (!cachedAccount) return AppState.LOADING;
    return cachedAccount.profile.onboarding_completed
      ? AppState.AUTHENTICATED
      : AppState.ONBOARDING;
  });
  const [user, setUser] = useState(cachedAccount?.user || null);
  const [profile, setProfile] = useState(cachedAccount?.profile || null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const authEventOccurred = useRef(false);

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError) {
      setAuthError(
        oauthError === "server_error"
          ? "Google sign-in failed while creating your account. Please apply the latest Supabase database migration and try again."
          : "Google sign-in could not be completed. Please try again.",
      );
    }

    if (!isSupabaseConfigured) {
      setAuthError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.",
      );
      setAppState(AppState.UNAUTHENTICATED);
      return undefined;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED") return;
      authEventOccurred.current = true;
      setAuthError("");
      setUser(session?.user ?? null);
      if (!session) {
        localStorage.removeItem(ACCOUNT_CACHE_KEY);
        setProfile(null);
        setAppState(AppState.UNAUTHENTICATED);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!active || authEventOccurred.current) return;
        if (error) throw error;
        setUser(session?.user ?? null);
        if (!session) {
          localStorage.removeItem(ACCOUNT_CACHE_KEY);
          setProfile(null);
          setAppState(AppState.UNAUTHENTICATED);
        }
      })
      .catch((error) => {
        if (!active || authEventOccurred.current) return;
        console.error("Failed to restore authentication session:", error);
        setAuthError(
          "Could not restore your session. Please refresh and try again.",
        );
        setAppState(AppState.UNAUTHENTICATED);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) return undefined;

    let active = true;
    const hasCachedProfile = profile?.id === user.id;
    if (!hasCachedProfile) setAppState(AppState.LOADING);
    supabase
      .from("profiles")
      .select("id, name, username, location, website, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profileData, error }) => {
        if (!active) return;
        if (error) throw error;
        setProfile(profileData);
        if (!profileData) localStorage.removeItem(ACCOUNT_CACHE_KEY);
        setAppState(
          profileData?.onboarding_completed
            ? AppState.AUTHENTICATED
            : AppState.ONBOARDING,
        );
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to fetch profile:", error);
        setAuthError(
          "Could not load your profile. Check the Supabase database setup and try again.",
        );
        if (!hasCachedProfile) setAppState(AppState.UNAUTHENTICATED);
      });

    return () => {
      active = false;
    };
  }, [user]);

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
    if (!supabase) return;
    setIsSigningIn(true);
    setAuthError("");
    try {
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
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem(ACCOUNT_CACHE_KEY);
    } catch (error) {
      console.error("Sign out error:", error);
      setAuthError("Could not sign out. Please try again.");
    }
  }, []);

  return {
    appState,
    authError,
    handleSignIn,
    handleSignOut,
    isSigningIn,
    profile,
    setAppState,
    setProfile,
    user,
  };
}
