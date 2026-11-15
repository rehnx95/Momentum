import { lazy, Suspense, useEffect } from "react";
import useAuthentication, { AppState } from "./features/auth/useAuthentication";
import AppLoadingFallback from "./shared/components/AppLoadingFallback";

const UnauthenticatedView = lazy(() => import("./features/auth/SignInPage"));
const OnboardingPage = lazy(() => import("./features/auth/OnboardingPage"));
const AuthenticatedApp = lazy(() => import("./features/dashboard/AuthenticatedApp"));

function preloadCurrentPage(pathname) {
  if (pathname === "/profile/edit") return import("./features/profile/pages/ProfileSettings");
  if (pathname === "/profile") return import("./features/profile/pages/ProfilePage");
  if (pathname === "/people") return import("./features/people/PeopleSearchPage");
  if (pathname === "/daily-log") return import("./features/daily-log/components/DailyTracker");
  if (pathname === "/privacy" || pathname === "/terms") {
    return import("./features/dashboard/LegalPage");
  }
  if (/^\/(?:user|u)\/[A-Za-z0-9-]{3,48}\/?$/.test(pathname)) {
    return import("./features/people/PublicProfilePage");
  }
  return null;
}

function App() {
  const {
    appState,
    authError,
    handleSignIn,
    handleSignOut,
    isSigningIn,
    profile,
    setAppState,
    setProfile,
    user,
  } = useAuthentication();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
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
    return <AppLoadingFallback />;
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
