import { lazy, Suspense, useEffect } from "react";
import useAuthentication, { AppState } from "./features/auth/useAuthentication";
import AppLoadingFallback from "./shared/components/AppLoadingFallback";

const UnauthenticatedView = lazy(() => import("./features/auth/SignInPage"));
const OnboardingPage = lazy(() => import("./features/auth/OnboardingPage"));
const loadAuthenticatedApp = () => import("./features/dashboard/AuthenticatedApp");
const AuthenticatedApp = lazy(loadAuthenticatedApp);

function preloadCurrentPage(pathname) {
  if (pathname === "/profile/edit") return import("./features/profile/pages/ProfileSettings");
  if (pathname === "/profile") return import("./features/profile/pages/ProfilePage");
  if (pathname === "/people") return import("./features/people/PeopleSearchPage");
  if (pathname === "/daily-log") return import("./features/daily-log/components/DailyTracker");
  if (/^\/(?:user|u)\/[A-Za-z0-9-]{3,48}\/?$/.test(pathname)) {
    return import("./features/people/PublicProfilePage");
  }
  return null;
}

// If this browser has signed in before, start fetching the app chunks now so the
// download overlaps with the session check instead of waiting for it.
try {
  if (localStorage.getItem("momentum:account-cache")) {
    loadAuthenticatedApp().catch(() => {});
    preloadCurrentPage(window.location.pathname)?.catch(() => {});
  }
} catch {
  // Storage may be unavailable; normal lazy loading still works.
}

function App() {
  const {
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
  } = useAuthentication();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    loadAuthenticatedApp().catch((error) => {
      console.warn("Could not preload the authenticated app:", error);
    });
    const preload = preloadCurrentPage(window.location.pathname);
    if (!preload) return;
    void preload.catch((error) => {
      console.warn("Could not preload the current page:", error);
    });
  }, [userId]);

  if (appState === AppState.UNAUTHENTICATED) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <UnauthenticatedView
          onSignIn={handleSignIn}
          isSigningIn={isSigningIn}
          error={authError}
        />
      </Suspense>
    );
  }

  if (appState === AppState.ONBOARDING && user) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <OnboardingPage
          user={user}
          profile={profile}
          onGoToDashboard={() => window.location.assign("/")}
          onComplete={(savedProfile) => {
            setProfile(savedProfile);
            setAppState(AppState.AUTHENTICATED);
          }}
          onSignOut={handleSignOut}
        />
      </Suspense>
    );
  }

  if (appState === AppState.LOADING) {
    return (
      <>
        <AppLoadingFallback />
        {authError && (
          <div
            role="alert"
            className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-xl items-center justify-between gap-4 rounded-lg border p-4 text-sm shadow-xl"
            style={{
              backgroundColor: "var(--surface-raised)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <p>{authError}</p>
            <button
              type="button"
              onClick={retryAuthentication}
              className="flex-shrink-0 rounded-md px-3 py-2 font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "var(--page)" }}
            >
              Retry
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <AuthenticatedApp
        user={user}
        profile={profile}
        authError={authError}
        onProfileUpdated={setProfile}
        onSignOut={handleSignOut}
      />
    </Suspense>
  );
}

export default App;
