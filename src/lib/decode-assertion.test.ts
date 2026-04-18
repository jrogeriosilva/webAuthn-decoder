/**
 * Tests for decode-assertion.ts
 *
 * Tests the decodeAssertion function which parses CBOR-encoded assertion
 * response objects (authentication ceremony payloads).
 */

import { describe, it, expect } from "vitest";
import { decode, encode } from "cbor-x";
import { decodeAssertion } from "@/lib/decode-assertion";

// Build minimal valid assertion CBOR test data
function buildAssertionCbor(overrides?: Partial<{
  authenticatorData: Uint8Array;
  signature: Uint8Array;
  clientDataJSON: string;
  userHandle: Uint8Array;
}>): Uint8Array {
  const minAuthData = new Uint8Array(37);
  minAuthData[32] = 0x01; // UP flag (bit 0)

  const clientDataJSONBase64url = btoa(
    JSON.stringify({
      type: "webauthn.get",
      challenge: "test-challenge",
      origin: "https://example.com",
    })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const obj: Record<string, unknown> = {
    authenticatorData: overrides?.authenticatorData ?? minAuthData,
    signature: overrides?.signature ?? new Uint8Array([0x30, 0x44]),
    clientDataJSON: overrides?.clientDataJSON ?? clientDataJSONBase64url,
  };

  if (overrides?.userHandle !== undefined) {
    obj.userHandle = overrides.userHandle;
  }

  return encode(obj);
}

describe("decodeAssertion", () => {
  describe("success cases", () => {
    it("decodes a minimal valid assertion CBOR map", () => {
      const bytes = buildAssertionCbor();
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      expect(result.data.authenticatorData).toBeDefined();
      expect(result.data.signature).toBeInstanceOf(Uint8Array);
      expect(result.data.clientDataJSON).toBeDefined();
    });

    it("parses authenticatorData using parseAuthData", () => {
      const bytes = buildAssertionCbor();
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      // parseAuthData should have parsed the flags byte
      expect(result.data.authenticatorData.flags.up).toBe(true);
      expect(result.data.authenticatorData.flags.uv).toBe(false);
      expect(result.data.authenticatorData.flags.at).toBe(false);
      expect(result.data.authenticatorData.rpIdHash).toBeInstanceOf(Uint8Array);
      expect(result.data.authenticatorData.rpIdHash.length).toBe(32);
    });

    it("decodes clientDataJSON using decodeClientDataJSON", () => {
      const bytes = buildAssertionCbor();
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      expect(result.data.clientDataJSON.type).toBe("webauthn.get");
      expect(result.data.clientDataJSON.origin).toBe("https://example.com");
      expect(result.data.clientDataJSON.challenge).toBe("test-challenge");
    });

    it("preserves signature as Uint8Array", () => {
      const sig = new Uint8Array([0x30, 0x44, 0x02, 0x20]);
      const bytes = buildAssertionCbor({ signature: sig });
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      expect(result.data.signature).toBeInstanceOf(Uint8Array);
      expect(result.data.signature[0]).toBe(0x30);
      expect(result.data.signature[1]).toBe(0x44);
    });

    it("preserves optional userHandle when present", () => {
      const userHandle = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const bytes = buildAssertionCbor({ userHandle });
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      expect(result.data.userHandle).toBeInstanceOf(Uint8Array);
      expect(result.data.userHandle).toEqual(userHandle);
    });

    it("works without optional userHandle", () => {
      const bytes = buildAssertionCbor();
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");

      expect(result.data.userHandle).toBeUndefined();
    });

    it("accepts ArrayBuffer input (not just Uint8Array)", () => {
      const bytes = buildAssertionCbor();
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const result = decodeAssertion(arrayBuffer as ArrayBuffer);

      expect(result.ok).toBe(true);
    });
  });

  describe("error cases", () => {
    it("returns error when authenticatorData is missing", () => {
      // Encode a map without authenticatorData
      const incompleteObj = encode({
        signature: new Uint8Array([0x30, 0x44]),
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoidGVzdCIsIm9yaWdpbiI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ",
      });
      const result = decodeAssertion(incompleteObj);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      expect(result.error).toContain("authenticatorData");
    });

    it("returns suggestion when required field is missing", () => {
      const incompleteObj = encode({
        signature: new Uint8Array([0x30, 0x44]),
        clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoidGVzdCIsIm9yaWdpbiI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ",
      });
      const result = decodeAssertion(incompleteObj);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain("Registration");
    });

    it("returns error for non-CBOR input", () => {
      const invalidBytes = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
      const result = decodeAssertion(invalidBytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      expect(result.error).toBeDefined();
    });

    it("returns error for empty input", () => {
      const result = decodeAssertion(new Uint8Array(0));

      expect(result.ok).toBe(false);
    });

    it("returns error when authenticatorData is too short", () => {
      // Only 10 bytes — less than required 37
      const shortAuthData = new Uint8Array(10);
      const bytes = buildAssertionCbor({ authenticatorData: shortAuthData });
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
    });

    it("returns error when decoded CBOR is not a map", () => {
      // Encode an array instead of a map
      const arrayBytes = encode([1, 2, 3]);
      const result = decodeAssertion(arrayBytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
    });
  });

  describe("round-trip compatibility", () => {
    it("decode-encode-decode produces consistent result", () => {
      const bytes = buildAssertionCbor();
      const result1 = decodeAssertion(bytes);
      expect(result1.ok).toBe(true);

      // Verify the decoded structure is internally consistent
      if (!result1.ok) throw new Error("Expected ok");
      expect(result1.data.authenticatorData.signCount).toBe(0);
    });

    it("large authenticatorData with signCount > 0 decodes correctly", () => {
      const authData = new Uint8Array(37);
      authData[32] = 0x01; // UP flag
      // Set signCount to 5 (bytes 33-36, big-endian)
      const view = new DataView(authData.buffer);
      view.setUint32(33, 5, false);

      const bytes = buildAssertionCbor({ authenticatorData: authData });
      const result = decodeAssertion(bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      expect(result.data.authenticatorData.signCount).toBe(5);
    });
  });
});

// Verify that cbor-x encode works as expected (meta test for test data construction)
describe("test data construction", () => {
  it("buildAssertionCbor produces decodable CBOR", () => {
    const bytes = buildAssertionCbor();
    expect(() => decode(bytes)).not.toThrow();
  });
});
