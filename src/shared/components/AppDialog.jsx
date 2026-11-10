import { useEffect } from "react";

export default function AppDialog({ dialog, onClose, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="app-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        className="app-dialog"
      >
        <h2 id="app-dialog-title">{dialog.title}</h2>
        <p id="app-dialog-message">{dialog.message}</p>
        <div className="app-dialog-actions">
          {dialog.type === "confirm" && (
            <button type="button" className="app-dialog-cancel" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="app-dialog-confirm"
            onClick={dialog.type === "confirm" ? onConfirm : onClose}
            autoFocus
          >
            {dialog.type === "confirm" ? "Continue" : "Got it"}
          </button>
        </div>
      </section>
    </div>
  );
}
