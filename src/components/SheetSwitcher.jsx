import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Trash2,
  Upload,
} from "lucide-react";

export default function SheetSwitcher({
  sheets,
  selected,
  loading,
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
          {selected?.title || (loading ? "Loading…" : "No sheet")}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="popover sheet-switcher-menu left-0 top-full" role="menu">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="popover-row">
              <button
                type="button"
                role="menuitem"
                className="popover-item"
                onClick={() => {
                  onSelect(sheet.id);
                  setOpen(false);
                }}
              >
                <span className="w-4 shrink-0">
                  {selected?.id === sheet.id && <Check size={14} />}
                </span>
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    color:
                      selected?.id === sheet.id ? "var(--text)" : undefined,
                  }}
                >
                  {sheet.title}
                </span>
                <span className="text-xs">{sheet.problemCount}</span>
              </button>
              {sheet.customId && (
                <button
                  type="button"
                  className="popover-trash"
                  aria-label={`Permanently remove ${sheet.title}`}
                  disabled={deletingId !== null}
                  onClick={() => {
                    setOpen(false);
                    onDelete(sheet);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {sheets.length === 0 && (
            <p className="px-3 py-2 text-sm" style={{ color: "var(--muted)" }}>
              No sheets yet.
            </p>
          )}
          <div className="popover-sep" />
          <button
            type="button"
            role="menuitem"
            className="popover-item"
            disabled={uploading}
            onClick={() => {
              setOpen(false);
              onUpload();
            }}
          >
            <Upload size={15} />{" "}
            {uploading ? "Converting and saving…" : "Upload a TXT sheet"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="popover-item"
            onClick={() => {
              setOpen(false);
              onSample();
            }}
          >
            <Download size={15} /> Download sample .txt
          </button>
        </div>
      )}
    </div>
  );
}
