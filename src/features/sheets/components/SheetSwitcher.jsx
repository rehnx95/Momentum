import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import SheetSwitcherMenu from "./SheetSwitcherMenu";

export default function SheetSwitcher({
  sheets,
  selected,
  onSelect,
  onUpload,
  uploading,
  onSample,
  onDelete,
  deletingId,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        className="sheet-switcher max-w-full"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BookOpen size={20} className="shrink-0" />
        <span className="page-title truncate">
          {selected?.title || "Select sheet"}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <SheetSwitcherMenu
          sheets={sheets}
          selected={selected}
          onSelect={onSelect}
          onUpload={onUpload}
          uploading={uploading}
          onSample={onSample}
          onDelete={onDelete}
          deletingId={deletingId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
