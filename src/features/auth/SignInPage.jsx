import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Learn with structure",
    description:
      "Use built-in DSA and Backend tracks or bring your own. Keep every problem and milestone moving forward.",
  },
  {
    icon: CalendarDays,
    title: "Make time visible",
    description:
      "Quick Log and timers capture activity and sleep; the Full Log shows recorded work, rest, and unlogged time together.",
  },
  {
    icon: BarChart3,
    title: "See the bigger picture",
    description:
      "Heatmaps, streaks, and activity and sleep trends—with average lines—show how small daily sessions add up over time.",
  },
  {
    icon: UsersRound,
    title: "Share progress selectively",
    description:
      "Let people find your public profile and see the learning progress you choose to share.",
  },
  {
    icon: ShieldCheck,
    title: "Keep your work yours",
    description:
      "Your progress is tied to your account, with tools to export and restore your learning data.",
  },
];

const weeklyActivity = [
  { day: "M", height: 48 },
  { day: "T", height: 74 },
  { day: "W", height: 58 },
  { day: "T", height: 92 },
  { day: "F", height: 66 },
  { day: "S", height: 82 },
  { day: "S", height: 38 },
];

function GoogleMark() {
  return (
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
  );
}

function GoogleSignInButton({ onSignIn, isSigningIn }) {
  return (
    <button
      type="button"
      onClick={onSignIn}
      disabled={isSigningIn}
      className="google-signin-button landing-google-button"
    >
      <GoogleMark />
      <span>{isSigningIn ? "Connecting to Google…" : "Continue with Google"}</span>
      {!isSigningIn && <ArrowRight size={17} aria-hidden="true" />}
    </button>
  );
}

function WorkspacePreview() {
  return (
    <section className="landing-preview" aria-labelledby="landing-preview-title">
      <div className="landing-preview-topbar">
        <div className="landing-preview-brand">
          <span className="landing-preview-mark">
            <Activity size={15} aria-hidden="true" />
          </span>
          <span>Momentum</span>
        </div>
        <span className="landing-preview-sample">SAMPLE WORKSPACE</span>
      </div>

      <div className="landing-preview-content">
        <div className="landing-preview-heading">
          <div>
            <span className="landing-preview-kicker">YOUR WEEK AT A GLANCE</span>
            <h2 id="landing-preview-title">Learning in motion</h2>
          </div>
          <span className="landing-preview-date">Oct 17 – 23</span>
        </div>

        <div className="landing-preview-stats">
          <div className="landing-preview-stat">
            <span>Active days</span>
            <strong>
              6 <small>/ 7</small>
            </strong>
          </div>
          <div className="landing-preview-stat">
            <span>Time focused</span>
            <strong>18h 40m</strong>
          </div>
          <div className="landing-preview-stat">
            <span>Avg. sleep</span>
            <strong>7h 52m</strong>
          </div>
        </div>

        <div className="landing-preview-track">
          <div className="landing-preview-track-heading">
            <span className="landing-preview-kicker">LEARNING TRACK</span>
            <strong>DSA practice</strong>
            <span className="landing-preview-progress-value">76%</span>
          </div>
          <div
            className="landing-preview-progress"
            role="progressbar"
            aria-label="Sample DSA track progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={76}
          >
            <span />
          </div>
        </div>

        <div className="landing-preview-chart">
          <div className="landing-preview-chart-heading">
            <strong>Weekly rhythm</strong>
            <span>Daily activity</span>
          </div>
          <div
            className="landing-preview-bars"
            role="img"
            aria-label="Sample weekly activity chart with six active days"
          >
            {weeklyActivity.map(({ day, height }, index) => (
              <div className="landing-preview-bar-column" key={`${day}-${index}`}>
                <span className="landing-preview-bar" style={{ height: `${height}%` }} />
                <span className="landing-preview-day">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-preview-note">
          <span className="landing-preview-note-icon">
            <BarChart3 size={16} aria-hidden="true" />
          </span>
          <span>
            <strong>Progress you can come back to</strong>
            <small>Learning, routines, and rest in one place</small>
          </span>
          <ArrowRight size={16} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

export default function UnauthenticatedView({ onSignIn, isSigningIn, error }) {
  return (
    <div className="auth-shell landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <a className="landing-brand" href="#top" aria-label="Momentum home">
            <span className="landing-brand-mark">
              <Activity size={20} strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span>Momentum</span>
          </a>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <button
            type="button"
            className="landing-header-cta"
            onClick={onSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? "Connecting…" : "Sign in"}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section className="auth-layout landing-hero" id="top" aria-labelledby="landing-title">
          <div className="auth-showcase landing-hero-copy">
            <div className="auth-showcase-copy">
              <span className="auth-showcase-eyebrow">
                <span className="landing-eyebrow-dot" />
                YOUR PROGRESS, IN ONE PLACE
              </span>
              <h1 id="landing-title">
                Make the work you do <span>add up.</span>
              </h1>
              <p>
                Bring learning tracks, daily activity, sleep, and progress insights into one
                personal workspace.
              </p>
              <div className="landing-hero-actions" id="get-started">
                <GoogleSignInButton onSignIn={onSignIn} isSigningIn={isSigningIn} />
                <a className="landing-secondary-link" href="#features">
                  Explore the workspace
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
              {error && (
                <p className="landing-auth-error" role="alert">
                  {error}
                </p>
              )}
              <div className="landing-trust-note">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Secure Google sign-in</span>
                <span className="landing-trust-separator" aria-hidden="true">
                  ·
                </span>
                <span>Your progress stays on your account</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <WorkspacePreview />
            <div className="landing-floating-note">
              <span className="landing-floating-indicator" />A clearer picture, day by day
            </div>
          </div>
        </section>

        <section className="landing-section landing-features" id="features">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">BUILT FOR THE WHOLE JOURNEY</span>
            <h2>One place for the work, the rhythm, and the results.</h2>
            <p>
              From your next practice session to the patterns you notice months later, Momentum
              keeps the pieces connected.
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article className="landing-feature-card" key={title}>
                <span className="landing-feature-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="landing-feature-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">A SIMPLE DAILY LOOP</span>
            <h2>Make progress easier to see.</h2>
          </div>
          <div className="landing-steps">
            <article className="landing-step">
              <span className="landing-step-number">01</span>
              <h3>Choose your path</h3>
              <p>Start with a learning track or make one that fits what you want to learn.</p>
            </article>
            <article className="landing-step">
              <span className="landing-step-number">02</span>
              <h3>Record the real day</h3>
              <p>Log focused work and sleep with quick entries, timers, and a flexible timeline.</p>
            </article>
            <article className="landing-step">
              <span className="landing-step-number">03</span>
              <h3>Notice what adds up</h3>
              <p>Look back at your streaks and trends, then share the progress you choose.</p>
            </article>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="landing-final-title">
          <div>
            <span className="landing-section-kicker">START WHERE YOU ARE</span>
            <h2 id="landing-final-title">Give your progress a place to grow.</h2>
            <p>Your next step is a good place to begin.</p>
          </div>
          <GoogleSignInButton onSignIn={onSignIn} isSigningIn={isSigningIn} />
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand landing-footer-brand" href="#top" aria-label="Momentum home">
          <span className="landing-brand-mark">
            <Activity size={18} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span>Momentum</span>
        </a>
        <span>Learning, routines, and progress—together.</span>
        <a href="#top">Back to top</a>
      </footer>
    </div>
  );
}
