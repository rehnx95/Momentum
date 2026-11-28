export function clearPointerFocusOnClick(event) {
  if (event.detail === 0 || !(event.target instanceof Element)) return;

  const control = event.target.closest(
    'button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])',
  );
  if (
    !(control instanceof HTMLElement) ||
    control.matches("input, textarea, select") ||
    control.isContentEditable
  ) {
    return;
  }

  control.blur();
}
