/**
 * Tests for attestationObject CBOR decoder.
 * attestationObject is a CBOR-encoded map with:
 *   - fmt: string (attestation format)
 *   - authData: Uint8Array (authenticatorData binary struct)
 *   - attStmt: map (attestation statement, format-specific)
 */
import { describe, it, expect } from "vitest";
import { encode } from "cbor-x";
import { decodeAttestationObject } from "./decode-attestation";

/** Build a minimal valid authData (37 bytes, UP flag set). */
function buildMinimalAuthData(): Uint8Array {
  const buf = new Uint8Array(37);
  buf[32] = 0x01; // UP flag
  return buf;
}

/** Build authData with AT flag and a minimal EC2 P-256 COSE key. */
function buildAuthDataWithAT(): Uint8Array {
  const aaguid = new Uint8Array(16).fill(0xaa);
  const credId = new Uint8Array(16).fill(0xbb);
  const coseKeyBytes = encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, new Uint8Array(32).fill(0x01)],
      [-3, new Uint8Array(32).fill(0x02)],
    ])
  );

  const headerSize = 37;
  const attestedSize = 16 + 2 + 16 + coseKeyBytes.length;
  const buf = new Uint8Array(headerSize + attestedSize);
  const view = new DataView(buf.buffer);

  buf[32] = 0x41; // UP + AT flags
  view.setUint32(33, 0, false); // signCount = 0

  let offset = 37;
  buf.set(aaguid, offset); offset += 16;
  view.setUint16(offset, 16, false); offset += 2;
  buf.set(credId, offset); offset += 16;
  buf.set(coseKeyBytes, offset);

  return buf;
}

/** Encode a valid minimal attestationObject CBOR. */
function buildAttestationObjectCbor(
  fmt = "none",
  authData = buildMinimalAuthData(),
  attStmt: Record<string, unknown> = {}
): Uint8Array {
  return encode({ fmt, authData, attStmt });
}

describe("decodeAttestationObject", () => {
  describe("valid attestationObject", () => {
    it("returns ok:true for minimal valid attestationObject with fmt 'none'", () => {
      const bytes = buildAttestationObjectCbor("none");
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
    });

    it("result.fmt equals the fmt string from CBOR", () => {
      const bytes = buildAttestationObjectCbor("packed");
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.fmt).toBe("packed");
    });

    it("result.attStmt contains the attestation statement", () => {
      const attStmt = { alg: -7, sig: new Uint8Array([1, 2, 3]) };
      const bytes = buildAttestationObjectCbor("packed", buildMinimalAuthData(), attStmt);
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.attStmt).toMatchObject({ alg: -7 });
    });

    it("result.rawAuthData is the raw authData bytes before parsing", () => {
      const authData = buildMinimalAuthData();
      const bytes = buildAttestationObjectCbor("none", authData);
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.rawAuthData).toBeInstanceOf(Uint8Array);
      expect(result.data.rawAuthData).toHaveLength(37);
    });

    it("result.authData is a fully parsed DecodedAuthData (delegates to parseAuthData)", () => {
      const bytes = buildAttestationObjectCbor("none");
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.authData).toBeDefined();
      expect(result.data.authData.rpIdHash).toBeInstanceOf(Uint8Array);
      expect(result.data.authData.rpIdHash).toHaveLength(32);
      expect(result.data.authData.flags).toMatchObject({
        up: true,
        uv: false,
        at: false,
        ed: false,
      });
      expect(result.data.authData.signCount).toBe(0);
    });

    it("result.authData.attestedCredentialData is populated when AT flag is set", () => {
      const authData = buildAuthDataWithAT();
      const bytes = buildAttestationObjectCbor("none", authData);
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.authData.attestedCredentialData).toBeDefined();
      const acd = result.data.authData.attestedCredentialData!;
      expect(acd.coseKey.kty.name).toBe("EC2");
      expect(acd.coseKey.alg.name).toBe("ES256");
    });

    it("accepts ArrayBuffer input", () => {
      const bytes = buildAttestationObjectCbor("none");
      // bytes.buffer may be a pooled buffer larger than bytes.byteLength.
      // Slice the underlying ArrayBuffer to get a correctly-bounded copy.
      const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const result = decodeAttestationObject(exactBuffer);
      expect(result.ok).toBe(true);
    });
  });

  describe("error cases", () => {
    it("returns error for non-CBOR bytes", () => {
      const garbage = new Uint8Array([0xff, 0xfe, 0xfd, 0x00, 0x01, 0x02]);
      const result = decodeAttestationObject(garbage);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBeDefined();
    });

    it("returns error when fmt field is missing", () => {
      // CBOR map without fmt field
      const bytes = encode({ authData: buildMinimalAuthData(), attStmt: {} });
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/fmt/i);
    });

    it("includes suggestion when fmt field is missing", () => {
      const bytes = encode({ authData: buildMinimalAuthData(), attStmt: {} });
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.suggestion).toBeDefined();
    });

    it("returns error when authData field is missing", () => {
      const bytes = encode({ fmt: "none", attStmt: {} });
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/authData/i);
    });

    it("includes suggestion when authData field is missing", () => {
      const bytes = encode({ fmt: "none", attStmt: {} });
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.suggestion).toBeDefined();
    });

    it("returns error when authData is too short (propagates from parseAuthData)", () => {
      const shortAuthData = new Uint8Array(10); // less than 37 bytes
      const bytes = encode({ fmt: "none", authData: shortAuthData, attStmt: {} });
      const result = decodeAttestationObject(bytes);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBeDefined();
    });

    it("returns error for empty input", () => {
      const result = decodeAttestationObject(new Uint8Array(0));
      expect(result.ok).toBe(false);
    });
  });
});
