// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dropdown from "./Dropdown";

afterEach(cleanup);

const options = [
  { value: "first", label: "First" },
  { value: "second", label: "Second" },
];

describe("Dropdown", () => {
  it("opens its custom list and reports a selected option", () => {
    const onChange = vi.fn();
    render(
      <Dropdown ariaLabel="Test options" value="first" options={options} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Test options" }));
    fireEvent.click(screen.getByRole("option", { name: "Second" }));

    expect(onChange).toHaveBeenCalledWith("second");
    expect(screen.queryByRole("listbox", { name: "Test options" })).toBeNull();
  });

  it("supports arrow-key selection and Escape", () => {
    const onChange = vi.fn();
    render(
      <Dropdown ariaLabel="Test options" value="first" options={options} onChange={onChange} />,
    );
    const trigger = screen.getByRole("combobox", { name: "Test options" });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("second");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Test options" })).toBeNull();
  });
});
