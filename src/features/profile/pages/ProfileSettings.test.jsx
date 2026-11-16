// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "./ProfileSettings";

vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

afterEach(cleanup);

describe("ProfileSettings", () => {
  it("only offers name and username fields", () => {
    render(
      <ProfileSettings
        userId="user-1"
        profile={{ name: "Rehan", username: "rehan" }}
        onBack={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Username" }).getAttribute("aria-describedby")).toBe(
      "profile-username-help",
    );
    expect(screen.getByText("3–45 characters; lowercase letters, numbers, and hyphens.").id).toBe(
      "profile-username-help",
    );
    expect(screen.queryByLabelText("Location")).toBeNull();
    expect(screen.queryByLabelText("Website / URL")).toBeNull();
  });
});
