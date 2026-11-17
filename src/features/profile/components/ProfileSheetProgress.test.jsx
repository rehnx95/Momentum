import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import ProfileSheetProgress from "./ProfileSheetProgress";

describe("ProfileSheetProgress", () => {
  it("offers a DSA restore action and disables it while restoring", () => {
    const onRestoreDsa = vi.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ProfileSheetProgress sheets={[]} onRestoreDsa={onRestoreDsa} />,
      );
    });

    let restoreButton = renderer.root
      .findAllByType("button")
      .find((button) => button.children.includes("Restore DSA"));
    expect(restoreButton).toBeDefined();
    act(() => restoreButton.props.onClick());
    expect(onRestoreDsa).toHaveBeenCalledOnce();

    act(() => {
      renderer.update(
        <ProfileSheetProgress sheets={[]} onRestoreDsa={onRestoreDsa} restoreDisabled />,
      );
    });
    restoreButton = renderer.root
      .findAllByType("button")
      .find((button) => button.children.includes("Restore DSA"));
    expect(restoreButton.props.disabled).toBe(true);

    act(() => renderer.unmount());
  });
});
