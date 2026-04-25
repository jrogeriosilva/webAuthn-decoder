import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SamplePayloadsMenu } from "./SamplePayloadsMenu";
import { getSamplePayloads } from "@/data/sample-payloads";

describe("SamplePayloadsMenu", () => {
  it("renders a trigger button labeled 'Load sample'", () => {
    render(<SamplePayloadsMenu onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /load sample/i })).toBeInTheDocument();
  });

  it("opens the menu and lists every sample on click", () => {
    render(<SamplePayloadsMenu onSelect={() => {}} />);
    const trigger = screen.getByRole("button", { name: /load sample/i });
    act(() => {
      fireEvent.click(trigger);
    });
    for (const sample of getSamplePayloads()) {
      expect(screen.getByText(sample.label)).toBeInTheDocument();
    }
  });

  it("invokes onSelect with the chosen sample when an item is clicked", () => {
    const onSelect = vi.fn();
    render(<SamplePayloadsMenu onSelect={onSelect} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /load sample/i }));
    });
    const samples = getSamplePayloads();
    const target = samples[0];
    act(() => {
      fireEvent.click(screen.getByText(target.label));
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: target.id });
  });
});
