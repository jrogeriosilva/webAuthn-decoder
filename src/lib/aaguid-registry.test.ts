import { describe, it, expect } from "vitest";
import { bytesToUuid, resolveAaguid } from "./aaguid-registry";

describe("bytesToUuid", () => {
  it("converts 16 bytes to lowercase hyphenated UUID string", () => {
    const bytes = new Uint8Array([
      0x08, 0x98, 0x70, 0x58, 0xca, 0xdc, 0x4b, 0x81, 0xb6, 0xe1, 0x30, 0xde,
      0x50, 0xdc, 0xbe, 0x96,
    ]);
    expect(bytesToUuid(bytes)).toBe(
      "08987058-cadc-4b81-b6e1-30de50dcbe96"
    );
  });

  it("throws for non-16-byte input", () => {
    expect(() => bytesToUuid(new Uint8Array(15))).toThrow(
      "AAGUID must be exactly 16 bytes"
    );
    expect(() => bytesToUuid(new Uint8Array(0))).toThrow(
      "AAGUID must be exactly 16 bytes"
    );
    expect(() => bytesToUuid(new Uint8Array(17))).toThrow(
      "AAGUID must be exactly 16 bytes"
    );
  });
});

describe("resolveAaguid", () => {
  it("resolves a known AAGUID to its authenticator name", () => {
    const bytes = new Uint8Array([
      0x08, 0x98, 0x70, 0x58, 0xca, 0xdc, 0x4b, 0x81, 0xb6, 0xe1, 0x30, 0xde,
      0x50, 0xdc, 0xbe, 0x96,
    ]);
    const name = resolveAaguid(bytes);
    expect(name).toBe("YubiKey 5 Series");
  });

  it("returns null for all-zero AAGUID", () => {
    const bytes = new Uint8Array(16);
    expect(resolveAaguid(bytes)).toBeNull();
  });

  it("returns null for unknown AAGUID", () => {
    const bytes = new Uint8Array([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff,
    ]);
    expect(resolveAaguid(bytes)).toBeNull();
  });

  it("handles registry UUIDs without case-sensitivity issues", () => {
    // All-zero bytes -> lowercase UUID "00000000-0000-0000-0000-000000000000"
    const zeroBytes = new Uint8Array(16);
    const uuid = bytesToUuid(zeroBytes);
    expect(uuid).toBe("00000000-0000-0000-0000-000000000000");
    expect(resolveAaguid(zeroBytes)).toBeNull();
  });
});
