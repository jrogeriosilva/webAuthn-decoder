import { describe, it, expect } from "vitest";
import { hexToBytes } from "@/lib/hex-utils";

describe("hexToBytes", () => {
  it("converts valid hex string to correct ArrayBuffer", () => {
    const result = hexToBytes("deadbeef");
    expect([...new Uint8Array(result)]).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("strips 0x prefix before conversion", () => {
    const result = hexToBytes("0xdeadbeef");
    expect([...new Uint8Array(result)]).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("strips uppercase 0X prefix before conversion", () => {
    const result = hexToBytes("0Xdeadbeef");
    expect([...new Uint8Array(result)]).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("handles uppercase hex chars", () => {
    const result = hexToBytes("DEADBEEF");
    expect([...new Uint8Array(result)]).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("throws for empty string", () => {
    expect(() => hexToBytes("")).toThrow("empty");
  });

  it("throws for odd number of characters", () => {
    expect(() => hexToBytes("abc")).toThrow("odd number of characters (3)");
  });

  it("throws for invalid hex character at position 0", () => {
    expect(() => hexToBytes("gg")).toThrow("unexpected character");
    expect(() => hexToBytes("gg")).toThrow("position 0");
  });

  it("throws for invalid hex character at later position", () => {
    expect(() => hexToBytes("abgh")).toThrow("unexpected character");
    expect(() => hexToBytes("abgh")).toThrow("position 2");
  });
});
