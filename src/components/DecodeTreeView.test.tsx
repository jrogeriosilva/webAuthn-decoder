import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DecodeTreeView } from "./DecodeTreeView";

describe("DecodeTreeView", () => {
  it("renders top-level and level-1 fields expanded (level < 2)", () => {
    const tree = {
      fmt: "packed",
      authData: {
        rpIdHash: "a1b2c3... [32 bytes]",
        signCount: 0,
      },
    };
    const { container } = render(<DecodeTreeView tree={tree} />);
    const text = container.textContent ?? "";
    expect(text).toContain("fmt");
    expect(text).toContain("packed");
    expect(text).toContain("authData");
    expect(text).toContain("signCount");
  });

  it("does NOT show deeply nested content on initial render (level >= 2 collapsed)", () => {
    const tree = {
      a: {
        b: {
          c: "deep",
        },
      },
    };
    const { container } = render(<DecodeTreeView tree={tree} />);
    const text = container.textContent ?? "";
    // Level 0 = root object, level 1 = a, level 2 = b (collapsed)
    // So "deep" should NOT appear
    expect(text).not.toContain("deep");
  });
});
