// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./OnboardingPage";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../../shared/lib/supabase", () => ({
  supabase: supabaseMocks,
}));

afterEach(cleanup);

describe("OnboardingPage", () => {
  it("only collects and saves a name and username", async () => {
    const query = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "user-1",
          name: "Rehan",
          username: "rehan",
          onboarding_completed: true,
        },
        error: null,
      }),
    };
    supabaseMocks.from.mockReturnValue(query);
    supabaseMocks.rpc.mockResolvedValue({ data: true, error: null });
    const onComplete = vi.fn();

    render(
      <OnboardingPage
        user={{ id: "user-1", user_metadata: {} }}
        profile={{
          name: "Rehan",
          username: "rehan",
          location: "Old location",
          website: "https://example.com",
        }}
        onGoToDashboard={vi.fn()}
        onComplete={onComplete}
        onSignOut={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Welcome to Momentum", level: 1 })).toBeTruthy();
    expect(screen.getByLabelText(/Full Name/)).toBeTruthy();
    expect(screen.getByLabelText(/Username \(Handle\)/)).toBeTruthy();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    const username = screen.getByLabelText(/Username \(Handle\)/);
    expect(username.maxLength).toBe(20);
    expect(screen.queryByLabelText("Username character count")).toBeNull();
    expect(screen.queryByText("@", { exact: true })).toBeNull();
    await screen.findByText("Username is available");
    const usernameField = username.closest(".onboarding-username-field");
    expect(usernameField.textContent).not.toContain("Available");
    expect(
      username.compareDocumentPosition(screen.getByText("Username is available")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("Location")).toBeNull();
    expect(screen.queryByText("Website / Portfolio")).toBeNull();

    fireEvent.submit(screen.getByRole("button", { name: "Get started" }).closest("form"));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(query.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        name: "Rehan",
        username: "rehan",
        onboarding_completed: true,
        updated_at: expect.any(String),
      },
      { onConflict: "id" },
    );
    expect(query.select).toHaveBeenCalledWith("id, name, username, onboarding_completed");
  });

  it("shows taken feedback without suggestions and keeps setup disabled", async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: false, error: null });
    supabaseMocks.from.mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    });

    render(
      <OnboardingPage
        user={{ id: "user-2", user_metadata: {} }}
        profile={{ name: "Rehan", username: "rehan" }}
        onGoToDashboard={vi.fn()}
        onComplete={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    await screen.findByText("This username is already taken");
    expect(screen.queryByText("Try")).toBeNull();
    expect(screen.queryByRole("button", { name: "rehan12" })).toBeNull();
    expect(screen.getByRole("button", { name: "Get started" }).disabled).toBe(true);
  });
});
