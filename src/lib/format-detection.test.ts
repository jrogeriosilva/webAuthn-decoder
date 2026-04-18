import { describe, it, expect } from "vitest";
import { detectAndNormalize } from "@/lib/format-detection";
import { base64 } from "@hexagon/base64";

describe("detectAndNormalize", () => {
  describe("empty/whitespace input", () => {
    it("returns error for empty string", () => {
      const result = detectAndNormalize("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("No input");
      }
    });

    it("returns error for whitespace-only string", () => {
      const result = detectAndNormalize("   ");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("No input");
      }
    });
  });

  describe("base64url detection", () => {
    it("detects base64url when input contains non-hex alphabetic chars", () => {
      // "SGVsbG8gV29ybGQ" = "Hello World" in base64url
      // Contains 'l', 'G', 's' etc which are outside hex range
      const result = detectAndNormalize("SGVsbG8gV29ybGQ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("base64url");
        const expected = base64.toArrayBuffer("SGVsbG8gV29ybGQ", true);
        expect(new Uint8Array(result.bytes)).toEqual(
          new Uint8Array(expected)
        );
      }
    });

    it("detects base64url when input contains underscore", () => {
      const input = "SGVsbG8_V29ybGQ";
      const result = detectAndNormalize(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("base64url");
      }
    });

    it("detects base64url when input contains hyphen", () => {
      const input = "SGVsbG8-V29ybGQ";
      const result = detectAndNormalize(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("base64url");
      }
    });
  });

  describe("hex detection", () => {
    it("detects even-length hex string", () => {
      const result = detectAndNormalize("deadbeef");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("hex");
        expect([...new Uint8Array(result.bytes)]).toEqual([
          0xde, 0xad, 0xbe, 0xef,
        ]);
      }
    });

    it("detects uppercase hex string", () => {
      const result = detectAndNormalize("DEADBEEF");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("hex");
      }
    });

    it("detects hex with 0x prefix", () => {
      const result = detectAndNormalize("0xdeadbeef");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("hex");
        expect([...new Uint8Array(result.bytes)]).toEqual([
          0xde, 0xad, 0xbe, 0xef,
        ]);
      }
    });
  });

  describe("ambiguous input", () => {
    it("returns error for odd-length all-hex-chars input", () => {
      const result = detectAndNormalize("abc");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/ambiguous|odd/i);
      }
    });
  });

  describe("invalid input", () => {
    it("returns error for input with non-hex chars that is not valid base64url", () => {
      const result = detectAndNormalize("not!valid");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Invalid base64url");
      }
    });

    it("returns error with position for characters outside all known charsets", () => {
      // Only hex chars + special char that is not base64url
      const result = detectAndNormalize("ab\x01cd");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("position");
      }
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace before detection", () => {
      const result = detectAndNormalize("  deadbeef  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("hex");
        expect([...new Uint8Array(result.bytes)]).toEqual([
          0xde, 0xad, 0xbe, 0xef,
        ]);
      }
    });
  });

  describe("hex/base64url overlap", () => {
    it("treats even-length all-hex-chars as hex (not base64url)", () => {
      // "aabb" is valid hex AND valid base64url, but should be treated as hex
      const result = detectAndNormalize("aabb");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("hex");
        expect([...new Uint8Array(result.bytes)]).toEqual([0xaa, 0xbb]);
      }
    });
  });
});
