// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import RecentAcceptedProblems from "./RecentAcceptedProblems";

afterEach(cleanup);

describe("RecentAcceptedProblems", () => {
  it("shows problem and sheet names without tooltips", () => {
    render(
      <RecentAcceptedProblems
        problems={[
          {
            id: "problem-1",
            title: "Two Sum",
            sheetTitle: "Dsa",
            acceptedOn: "2026-11-16",
          },
        ]}
      />,
    );

    expect(screen.getByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("DSA")).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
