import { useEffect, useMemo, useRef, useState } from "react";

export default function AppDialog({ dialog, onClose, onConfirm }) {
  const [typedValue, setTypedValue] = useState("");
  const containerRef = useRef(null);
  const isConfirmDangerous = Boolean(dialog?.dangerous);
  const requiredWord = dialog?.requireWord || "";
  const confirmLabel = dialog?.confirmText || (isConfirmDangerous ? "Reset" : "Continue");
  const isTypedConfirmValid = !requiredWord || typedValue.trim() === requiredWord;
  const actionButtonClass = isConfirmDangerous
    ? "app-dialog-confirm app-dialog-confirm-danger"
    : "app-dialog-confirm";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(
        containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;
    const target =
      dialog?.type === "confirm" && requiredWord
        ? containerRef.current.querySelector("#app-dialog-confirmation-input")
        : containerRef.current.querySelector(".app-dialog-confirm") ||
          containerRef.current.querySelector(".app-dialog-cancel") ||
          containerRef.current;
    target?.focus();
  }, [dialog, requiredWord]);

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
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        className="app-dialog"
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
