import {
  Check,
  Download,
  Trash2,
  Upload,
} from "lucide-react";

export default function SheetSwitcherMenu({
  sheets,
  selected,
  onSelect,
  onUpload,
  uploading,
  onSample,
  onDelete,
  deletingId,
  onClose,
}) {
  return (
    <div className="popover sheet-switcher-menu left-0 top-full" role="menu">
      {sheets.map((sheet) => (
        <div key={sheet.id} className="popover-row">
          <button
            type="button"
            role="menuitem"
            className="popover-item"
            onClick={() => {
              onSelect(sheet.id);
              onClose();
            }}
          >
            <span className="w-4 shrink-0">
              {selected?.id === sheet.id && <Check size={14} />}
            </span>
            <span
              className="min-w-0 flex-1 truncate"
              style={{
                color: selected?.id === sheet.id ? "var(--text)" : undefined,
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
                onClose();
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
          onClose();
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
          onClose();
          onSample();
        }}
      >
        <Download size={15} /> Download sample .txt
      </button>
    </div>
  );
}
