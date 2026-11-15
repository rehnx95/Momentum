export default function LegalPage({ mode = "privacy", onBack }) {
  const isPrivacy = mode === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const intro = isPrivacy
    ? "We keep your Momentum account data private and focused on your progress."
    : "These terms explain how you use Momentum and what to expect from the app.";

  const sections = isPrivacy
    ? [
        {
          heading: "What we keep",
          body:
            "We store the profile, sheet progress, day logs, and account metadata required to keep your dashboard in sync across devices.",
        },
        {
          heading: "How we use it",
          body:
            "Your data is used only to power your tracker, daily log, and public profile features that you intentionally choose to share.",
        },
        {
          heading: "Your control",
          body:
            "You can sign out at any time, and account-level caches are cleared to prevent stale personal data from staying behind in local storage.",
        },
      ]
    : [
        {
          heading: "Use of the app",
          body:
            "Momentum is provided to help you track progress, log daily activity, and stay consistent with your personal goals.",
        },
        {
          heading: "Content responsibility",
          body:
            "You are responsible for the information you enter, including profile details, logs, and progress updates you publish publicly.",
        },
        {
          heading: "Service changes",
          body:
            "We may improve or modify the app and related features over time, but we will try to keep the core experience stable and transparent.",
        },
      ];

  return (
    <section className="surface-card rounded-2xl border p-6 sm:p-8">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A1A1A1]">
            {isPrivacy ? "Privacy" : "Terms"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#EDEDED]">{title}</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[#3A3A3A] bg-transparent px-4 py-2 text-sm font-medium text-[#EDEDED] transition-colors hover:border-[#5A5A5A] hover:bg-[#111111]"
        >
          Back to dashboard
        </button>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-[#C7C7C7]">{intro}</p>

      <div className="mt-8 space-y-6">
        {sections.map(({ heading, body }) => (
          <article key={heading} className="rounded-xl border border-[#202020] bg-[#111111] p-5">
            <h2 className="text-lg font-semibold text-[#EDEDED]">{heading}</h2>
            <p className="mt-2 text-sm leading-7 text-[#C7C7C7]">{body}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#A1A1A1]">
        <button
          type="button"
          onClick={() => window.location.assign(isPrivacy ? "/terms" : "/privacy")}
          className="rounded-lg border border-[#2E2E2E] bg-[#111111] px-3 py-2 text-[#EDEDED] transition-colors hover:border-[#4B4B4B] hover:bg-[#1A1A1A]"
        >
          {isPrivacy ? "Read Terms of Service" : "Read Privacy Policy"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[#2E2E2E] bg-transparent px-3 py-2 text-[#EDEDED] transition-colors hover:border-[#4B4B4B] hover:bg-[#111111]"
        >
          Return home
        </button>
      </div>
    </section>
  );
}
