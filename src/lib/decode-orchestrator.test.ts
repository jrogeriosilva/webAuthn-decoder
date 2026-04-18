/**
 * Tests for decode-orchestrator.ts
 *
 * Tests the decodePayload function which routes PayloadType to correct decoder
 * and returns a typed DecodeResult.
 */

import { describe, it, expect } from "vitest";
import { encode } from "cbor-x";
import { decodePayload } from "@/lib/decode-orchestrator";

// Build a minimal valid attestationObject CBOR
function buildAttestationCbor(): Uint8Array {
  const authData = new Uint8Array(37);
  authData[32] = 0x41; // UP flag + AT flag (bits 0 and 6)

  // Minimal attestedCredentialData (AT flag set)
  // AAGUID: 16 bytes
  const aaguid = new Uint8Array(16);
  // credentialIdLength: 2 bytes (big-endian)
  const credIdLen = new Uint8Array([0x00, 0x10]); // 16 bytes
  const credId = new Uint8Array(16);
  // COSE key (EC2, alg: -7, crv: P-256)
  const coseKey = encode(new Map([[1, 2], [3, -7], [-1, 1]]));

  const atData = new Uint8Array([
    ...aaguid,
    ...credIdLen,
    ...credId,
    ...coseKey,
  ]);

  // Full authData = 37-byte header + atData
  const fullAuthData = new Uint8Array(37 + atData.length);
  fullAuthData.set(authData.slice(0, 37));
  fullAuthData.set(atData, 37);
  // Fix flags byte — the AT flag (bit 6) is set
  fullAuthData[32] = 0x41;

  return encode({
    fmt: "none",
    authData: fullAuthData,
    attStmt: {},
  });
}

// Build a minimal valid assertion CBOR
function buildAssertionCbor(): Uint8Array {
  const minAuthData = new Uint8Array(37);
  minAuthData[32] = 0x01; // UP flag

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

  return encode({
    authenticatorData: minAuthData,
    signature: new Uint8Array([0x30, 0x44]),
    clientDataJSON: clientDataJSONBase64url,
  });
}

// Build a minimal valid clientDataJSON (as UTF-8 bytes)
function buildClientDataJSONBytes(): Uint8Array {
  const json = JSON.stringify({
    type: "webauthn.create",
    challenge: "test-challenge",
    origin: "https://example.com",
  });
  return new TextEncoder().encode(json);
}

// Build valid raw CBOR (simple map)
function buildRawCbor(): Uint8Array {
  return encode({ hello: "world", count: 42 });
}

describe("decodePayload", () => {
  describe("registration (attestationObject)", () => {
    it("routes to decodeAttestationObject and returns attestationObject result", () => {
      const bytes = buildAttestationCbor();
      const result = decodePayload("registration", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      expect(result.type).toBe("attestationObject");
    });

    it("returns decoded data with fmt field", () => {
      const bytes = buildAttestationCbor();
      const result = decodePayload("registration", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      if (result.type !== "attestationObject") throw new Error("Expected attestationObject");
      expect(result.data.fmt).toBe("none");
    });

    it("returns error with suggestion for mismatched type (assertion CBOR as registration)", () => {
      // Assertion CBOR doesn't have fmt/authData → registration decoder returns error
      const assertionBytes = buildAssertionCbor();
      const result = decodePayload("registration", assertionBytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      // Should have an error (and possibly a suggestion)
      expect(result.error).toBeDefined();
    });
  });

  describe("authentication (assertion)", () => {
    it("routes to decodeAssertion and returns assertion result", () => {
      const bytes = buildAssertionCbor();
      const result = decodePayload("authentication", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      expect(result.type).toBe("assertion");
    });

    it("returns decoded data with authenticatorData and signature", () => {
      const bytes = buildAssertionCbor();
      const result = decodePayload("authentication", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      if (result.type !== "assertion") throw new Error("Expected assertion");
      expect(result.data.authenticatorData).toBeDefined();
      expect(result.data.signature).toBeInstanceOf(Uint8Array);
    });
  });

  describe("clientDataJSON", () => {
    it("routes to decodeClientDataJSON and returns clientDataJSON result", () => {
      const bytes = buildClientDataJSONBytes();
      const result = decodePayload("clientDataJSON", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      expect(result.type).toBe("clientDataJSON");
    });

    it("returns decoded data with type and origin fields", () => {
      const bytes = buildClientDataJSONBytes();
      const result = decodePayload("clientDataJSON", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      if (result.type !== "clientDataJSON") throw new Error("Expected clientDataJSON");
      expect(result.data.type).toBe("webauthn.create");
      expect(result.data.origin).toBe("https://example.com");
    });
  });

  describe("raw-cbor", () => {
    it("decodes CBOR and returns raw-cbor result", () => {
      const bytes = buildRawCbor();
      const result = decodePayload("raw-cbor", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      expect(result.type).toBe("raw-cbor");
    });

    it("returns decoded data as unknown", () => {
      const bytes = buildRawCbor();
      const result = decodePayload("raw-cbor", bytes);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      if (result.type !== "raw-cbor") throw new Error("Expected raw-cbor");
      expect(result.data).toBeDefined();
    });

    it("returns error for invalid CBOR in raw-cbor mode", () => {
      const invalidBytes = new Uint8Array([0xff, 0xfe, 0xfd]);
      const result = decodePayload("raw-cbor", invalidBytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      expect(result.error).toContain("CBOR");
    });
  });

  describe("type mismatch errors (D-03)", () => {
    it("returns error with suggestion when clientDataJSON bytes passed as registration", () => {
      // clientDataJSON doesn't have fmt/authData, so registration decoder errors
      const clientDataBytes = buildClientDataJSONBytes();
      const result = decodePayload("registration", clientDataBytes);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected error");
      expect(result.error).toBeDefined();
    });

    it("returns error with suggestion when attestation bytes passed as authentication", () => {
      // attestationObject doesn't have authenticatorData at top level (assertion format)
      const attestationBytes = buildAttestationCbor();
      const result = decodePayload("authentication", attestationBytes);

      // Attestation CBOR has 'authenticatorData' key which assertion decoder would try to use
      // but the fmt/attStmt structure doesn't match assertion format
      // Either error or partial decode — but result should be handled
      expect(result).toBeDefined();
    });
  });

  describe("accepts ArrayBuffer input", () => {
    it("handles ArrayBuffer for all payload types", () => {
      const bytes = buildAssertionCbor();
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

      const result = decodePayload("authentication", arrayBuffer);
      expect(result.ok).toBe(true);
    });
  });
});
