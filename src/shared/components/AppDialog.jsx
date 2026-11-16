import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export default function AppDialog({ dialog, onClose, onConfirm }) {
  const [typedValue, setTypedValue] = useState("");
  const dialogRef = useRef(null);

  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialogNode = dialogRef.current;
    const initialFocus =
      dialogNode?.querySelector("#app-dialog-confirmation-input:not(:disabled)") ||
      dialogNode?.querySelector("button:not(:disabled), input:not(:disabled)");
    (initialFocus || dialogNode)?.focus();

    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const isConfirmDangerous = Boolean(dialog?.dangerous);
  const requiredWord = dialog?.requireWord || "";
  const confirmLabel = dialog?.confirmText || (isConfirmDangerous ? "Reset" : "Continue");
  const isTypedConfirmValid = !requiredWord || typedValue.trim() === requiredWord;
  const actionButtonClass = isConfirmDangerous
    ? "app-dialog-confirm app-dialog-confirm-danger"
    : "app-dialog-confirm";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialogNode = dialogRef.current;
      const focusable = dialogNode?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        dialogNode?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsInside = dialogNode.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !focusIsInside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusIsInside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const explanation = useMemo(() => {
    if (!requiredWord) return null;
    return `Type “${requiredWord}” to confirm.`;
  }, [requiredWord]);

  return (
    <div
      className="app-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        className="app-dialog"
        tabIndex={-1}
      >
        <h2 id="app-dialog-title">{dialog.title}</h2>
        <p id="app-dialog-message">{dialog.message}</p>
        {dialog.type === "confirm" && requiredWord && (
          <div className="app-dialog-confirmation">
            <label htmlFor="app-dialog-confirmation-input">{explanation}</label>
            <input
              id="app-dialog-confirmation-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              placeholder={requiredWord}
            />
          </div>
        )}
        <div className="app-dialog-actions">
          {dialog.type === "confirm" && (
            <button type="button" className="app-dialog-cancel" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className={actionButtonClass}
            onClick={dialog.type === "confirm" ? () => isTypedConfirmValid && onConfirm() : onClose}
            disabled={dialog.type === "confirm" && requiredWord && !isTypedConfirmValid}
          >
            {dialog.type === "confirm" ? confirmLabel : "Got it"}
          </button>
        </div>
      </section>
    </div>
  );
}
