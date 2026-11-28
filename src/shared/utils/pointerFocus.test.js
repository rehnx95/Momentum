// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { clearPointerFocusOnClick } from "./pointerFocus";

function clickWithDetail(target, detail) {
  target.addEventListener("click", clearPointerFocusOnClick);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, detail }));
  target.removeEventListener("click", clearPointerFocusOnClick);
}

describe("clearPointerFocusOnClick", () => {
  it("clears focus from a pointer-activated button", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();

    clickWithDetail(button, 1);
    expect(document.activeElement).not.toBe(button);

    button.remove();
  });

  it("preserves keyboard focus", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();

    clickWithDetail(button, 0);
    expect(document.activeElement).toBe(button);

    button.remove();
  });

  it("preserves focus in editable controls", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    clickWithDetail(input, 1);
    expect(document.activeElement).toBe(input);

    input.remove();
  });
});
