import { Activity } from "lucide-react";

function MomentumBrand({ onNavigate, subtitle }) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-label="Momentum — go to dashboard"
      className="momentum-brand flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left"
    >
      <span className="momentum-brand-logo flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
        <Activity size={21} strokeWidth={2.25} className="text-onAccent" />
      </span>
      <span className="momentum-brand-copy min-w-0">
        <span className="momentum-brand-name block font-semibold tracking-tight">Momentum</span>
        {subtitle && <span className="momentum-brand-context block truncate">{subtitle}</span>}
      </span>
    </button>
  );
}

export default MomentumBrand;
