import { lazy, Suspense } from "react";
import useAuthentication, { AppState } from "./features/auth/useAuthentication";
import AppLoadingFallback from "./shared/components/AppLoadingFallback";

const UnauthenticatedView = lazy(() => import("./features/auth/SignInPage"));
const OnboardingPage = lazy(() => import("./features/auth/OnboardingPage"));
const AuthenticatedApp = lazy(() => import("./features/dashboard/AuthenticatedApp"));

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
