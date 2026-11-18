// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfflineSyncStatus from "./OfflineSyncStatus";

afterEach(cleanup);

describe("OfflineSyncStatus", () => {
  it("shows offline details when the status icon is clicked", () => {
    render(
      <OfflineSyncStatus
        online={false}
        pendingCount={1}
        syncing={false}
        message=""
        onRetry={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /connection status: offline/i }));

    expect(screen.getByRole("group", { name: "Connection status" }).textContent).toContain(
      "Offline. 1 change is saved here and will sync when you're back online.",
    );
    expect(screen.queryByText("Offline. Changes are saved on this device.")).toBeNull();
  });

  it("shows pending sync details on hover and allows a manual retry", () => {
    const onRetry = vi.fn();
    render(
      <OfflineSyncStatus
        online
        pendingCount={2}
        syncing={false}
        message=""
        onRetry={onRetry}
      />,
    );

    const statusButton = screen.getByRole("button", {
      name: "Connection status: 2 changes waiting to sync.",
    });
    fireEvent.mouseEnter(statusButton);

    expect(
      screen.getByRole("group", { name: "Connection status" }).textContent,
    ).toContain("2 changes waiting to sync.");
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
