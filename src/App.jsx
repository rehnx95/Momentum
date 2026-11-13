import UnauthenticatedView from "./features/auth/SignInPage";
import OnboardingPage from "./features/auth/OnboardingPage";
import useAuthentication, { AppState } from "./features/auth/useAuthentication";
import AuthenticatedApp from "./features/dashboard/AuthenticatedApp";

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
      <UnauthenticatedView
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        error={authError}
      />
    );
  }

  if (appState === AppState.ONBOARDING && user) {
    return (
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
    );
  }

  if (appState === AppState.LOADING) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <span className="app-loading-spinner" aria-hidden="true" />
        <p>Loading your account…</p>
      </div>
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      profile={profile}
      authError={authError}
      onProfileUpdated={setProfile}
      onSignOut={handleSignOut}
    />
  );
}

export default App;
