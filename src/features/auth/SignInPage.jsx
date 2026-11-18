import { Activity } from "lucide-react";
import { useState } from "react";

export default function UnauthenticatedView({
  onSignIn,
  onPasswordSignIn,
  onSignUp,
  onPrepareApp,
  onClearError,
  isSigningIn,
  authAction,
  error,
}) {
  const [mode, setMode] = useState("sign-in");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword("");
    onClearError?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    onPrepareApp?.();
    if (mode === "sign-in") {
      await onPasswordSignIn(identifier.trim(), password);
      return;
    }

    await onSignUp(email.trim(), password);
  };

  const handleGoogleSignIn = () => {
    onPrepareApp?.();
    onSignIn();
  };

  return (
    <div className="auth-shell min-h-screen bg-page text-text font-sans">
      <div className="auth-layout auth-layout-simple">
        <section className="auth-panel-wrap">
          <div className="auth-panel">
            <div className="auth-simple-brand">
              <div className="brand-mark">
                <Activity size={16} strokeWidth={2.25} className="text-onAccent" />
              </div>
              <span>Momentum</span>
            </div>
            <h1 className="auth-simple-title">Make progress every day.</h1>
            <p className="auth-panel-description">
              Bring your learning, routines, and daily progress together in one place.
            </p>
            {error && (
              <p role="alert" className="auth-error-message">
                {error}
              </p>
            )}
            <div className="auth-mode-tabs" role="group" aria-label="Account access">
              <button
                type="button"
                aria-pressed={mode === "sign-in"}
                className={mode === "sign-in" ? "is-active" : ""}
                disabled={isSigningIn}
                onClick={() => switchMode("sign-in")}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === "sign-up"}
                className={mode === "sign-up" ? "is-active" : ""}
                disabled={isSigningIn}
                onClick={() => switchMode("sign-up")}
              >
                Create account
              </button>
            </div>
            <form className="auth-credential-form" onSubmit={handleSubmit}>
              {mode === "sign-in" ? (
                <div className="auth-form-field">
                  <label htmlFor="auth-identifier">Email or username</label>
                  <input
                    id="auth-identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="auth-form-field">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              )}
              <div className="auth-form-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={mode === "sign-up" ? 6 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={isSigningIn} className="auth-credential-submit">
                {authAction === (mode === "sign-in" ? "password" : "sign-up")
                  ? mode === "sign-in"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>
            <div className="auth-divider">
              <span>OR</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="google-signin-button"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {authAction === "google" ? "Connecting to Google…" : "Continue with Google"}
            </button>
            <p className="auth-mode-switch">
              {mode === "sign-in" ? "New to Momentum?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              >
                {mode === "sign-in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
