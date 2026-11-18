// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UnauthenticatedView from "./SignInPage";

afterEach(cleanup);

describe("UnauthenticatedView", () => {
  it("signs in with a username and password", async () => {
    const onPasswordSignIn = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <UnauthenticatedView
        onSignIn={vi.fn()}
        onPasswordSignIn={onPasswordSignIn}
        onSignUp={vi.fn()}
        onClearError={vi.fn()}
        isSigningIn={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Email or username"), {
      target: { value: "rehan" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(container.querySelector(".auth-credential-submit"));

    await waitFor(() => expect(onPasswordSignIn).toHaveBeenCalledWith("rehan", "password123"));
  });

  it("creates an account with email and password", async () => {
    const onSignUp = vi.fn().mockResolvedValue(true);
    render(
      <UnauthenticatedView
        onSignIn={vi.fn()}
        onPasswordSignIn={vi.fn()}
        onSignUp={onSignUp}
        onClearError={vi.fn()}
        isSigningIn={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "rehan@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByLabelText("Password").closest("form"));

    await waitFor(() => expect(onSignUp).toHaveBeenCalledWith("rehan@example.com", "password123"));
  });

  it("switches modes from the segmented control", () => {
    const onClearError = vi.fn();
    render(
      <UnauthenticatedView
        onSignIn={vi.fn()}
        onPasswordSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onClearError={onClearError}
        isSigningIn={false}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("group", { name: "Account access" })).getByRole("button", {
        name: "Create account",
      }),
    );

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(onClearError).toHaveBeenCalledOnce();
  });

  it("places email and password sign-in before Google sign-in", () => {
    const { container } = render(
      <UnauthenticatedView
        onSignIn={vi.fn()}
        onPasswordSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onClearError={vi.fn()}
        isSigningIn={false}
      />,
    );
    const panelChildren = Array.from(container.querySelector(".auth-panel").children);

    expect(panelChildren.indexOf(container.querySelector(".auth-credential-form"))).toBeLessThan(
      panelChildren.indexOf(container.querySelector(".google-signin-button")),
    );
  });
});
