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

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByText("Location")).toBeNull();
    expect(screen.queryByText("Website / Portfolio")).toBeNull();

    fireEvent.submit(screen.getByRole("button", { name: "Complete Setup" }).closest("form"));

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
});
