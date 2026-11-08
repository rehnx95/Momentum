import { CheckSquare } from 'lucide-react';

function TrackSheetBrand({ onNavigate, subtitle }) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-label="Track Sheet — go to dashboard"
      className="track-sheet-brand flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg text-left"
    >
      <span className="track-sheet-brand-logo flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EDEDED]">
        <CheckSquare size={16} className="text-black" />
      </span>
      <span className="track-sheet-brand-copy min-w-0">
        <span className="track-sheet-brand-name block font-bold tracking-tight">Track Sheet</span>
        {subtitle && (
          <span className="track-sheet-brand-context block">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

export default TrackSheetBrand;
