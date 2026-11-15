// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./SignInPage";

afterEach(cleanup);

describe("SignInPage", () => {
  it("introduces the main product features and starts Google sign-in", () => {
    const onSignIn = vi.fn();

    render(<SignInPage onSignIn={onSignIn} isSigningIn={false} error={null} />);

    expect(screen.getByRole("heading", { name: /make the work you do add up/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Learn with structure" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Make time visible" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "See the bigger picture" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Share progress selectively" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Keep your work yours" })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /continue with google/i })[0]);

    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it("shows sign-in errors and disables Google buttons while connecting", () => {
    render(
      <SignInPage
        onSignIn={vi.fn()}
        isSigningIn={true}
        error="Google sign-in could not be completed."
      />,
    );

    expect(screen.getByRole("alert").textContent).toBe("Google sign-in could not be completed.");
    expect(
      screen
        .getAllByRole("button", { name: /connecting to google/i })
        .every((button) => button.disabled),
    ).toBe(true);
  });
});
