/**
 * Tests for authenticatorData binary parser.
 * authenticatorData is a binary struct (NOT CBOR) with:
 *   - 32 bytes rpIdHash
 *   - 1 byte flags
 *   - 4 bytes signCount (big-endian uint32)
 *   - [optional] attestedCredentialData if AT flag set
 *   - [optional] extensions CBOR if ED flag set
 */
import { describe, it, expect } from "vitest";
import { encode } from "cbor-x";
import { parseAuthData } from "./decode-authdata";

/** Build a minimal authData buffer (37 bytes, no AT/ED). */
function buildMinimalAuthData(flagsByte: number, signCount = 0): Uint8Array {
  const buf = new Uint8Array(37);
  // bytes 0-31: rpIdHash (all zeros)
  // byte 32: flags
  buf[32] = flagsByte;
  // bytes 33-36: signCount big-endian uint32
  const view = new DataView(buf.buffer);
  view.setUint32(33, signCount, false);
  return buf;
}

/** Build an authData with AT flag and an EC2 P-256 COSE key. */
function buildAuthDataWithAT(
  flagsByte: number,
  credIdLength = 16,
  signCount = 42
): Uint8Array {
  const aaguid = new Uint8Array(16).fill(0xaa);
  const credId = new Uint8Array(credIdLength).fill(0xbb);

  // EC2 P-256 COSE key: { 1: 2, 3: -7, -1: 1, -2: x_bytes, -3: y_bytes }
  const coseKeyBytes = encode(
    new Map([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, new Uint8Array(32).fill(0x01)],
      [-3, new Uint8Array(32).fill(0x02)],
    ])
  );

  const headerSize = 37;
  const attestedSize = 16 + 2 + credIdLength + coseKeyBytes.length;
  const buf = new Uint8Array(headerSize + attestedSize);
  const view = new DataView(buf.buffer);

  // rpIdHash: bytes 0-31 (zeros)
  // flags
  buf[32] = flagsByte;
  // signCount
  view.setUint32(33, signCount, false);

  let offset = 37;
  // AAGUID (16 bytes)
  buf.set(aaguid, offset);
  offset += 16;
  // credentialIdLength (2 bytes big-endian)
  view.setUint16(offset, credIdLength, false);
  offset += 2;
  // credentialId
  buf.set(credId, offset);
  offset += credIdLength;
  // COSE key
  buf.set(coseKeyBytes, offset);

  return buf;
}

describe("parseAuthData", () => {
  describe("minimal authData (37 bytes, no AT/ED)", () => {
    it("parses rpIdHash as 32 zero bytes", () => {
      const data = buildMinimalAuthData(0x01);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.rpIdHash).toHaveLength(32);
      expect(Array.from(result.data.rpIdHash)).toEqual(new Array(32).fill(0));
    });

    it("parses signCount = 0", () => {
      const data = buildMinimalAuthData(0x01, 0);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.signCount).toBe(0);
    });

    it("parses signCount = 999", () => {
      const data = buildMinimalAuthData(0x01, 999);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.signCount).toBe(999);
    });

    it("does not include attestedCredentialData when AT=0", () => {
      const data = buildMinimalAuthData(0x01);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.attestedCredentialData).toBeUndefined();
    });
  });

  describe("flags parsing", () => {
    it("flags byte 0x01 → { up: true, uv: false, at: false, ed: false }", () => {
      const data = buildMinimalAuthData(0x01);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.flags).toMatchObject({
        up: true,
        uv: false,
        at: false,
        ed: false,
        rawByte: 0x01,
      });
    });

    it("flags byte 0x05 → { up: true, uv: true, at: false, ed: false }", () => {
      // 0x05 = 0b00000101: bit0=1 (UP), bit2=1 (UV)
      const data = buildMinimalAuthData(0x05);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.flags).toMatchObject({
        up: true,
        uv: true,
        at: false,
        ed: false,
        rawByte: 0x05,
      });
    });

    it("flags byte 0x41 → { up: true, uv: false, at: true, ed: false }", () => {
      // 0x41 = 0b01000001: bit0=1 (UP), bit6=1 (AT)
      // Use AT builder to have enough bytes
      const data = buildAuthDataWithAT(0x41);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.flags).toMatchObject({
        up: true,
        uv: false,
        at: true,
        ed: false,
        rawByte: 0x41,
      });
    });

    it("flags byte 0xC5 → { up: true, uv: true, at: true, ed: true }", () => {
      // 0xC5 = 0b11000101: bit0=1 (UP), bit2=1 (UV), bit6=1 (AT), bit7=1 (ED)
      // Build authData with AT=1 and ED=1, append an empty CBOR map as extensions
      const baseWithAT = buildAuthDataWithAT(0xc5);
      const extensionsCbor = encode({ appid: true });
      const full = new Uint8Array(baseWithAT.length + extensionsCbor.length);
      full.set(baseWithAT);
      full.set(extensionsCbor, baseWithAT.length);
      const result = parseAuthData(full);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.flags).toMatchObject({
        up: true,
        uv: true,
        at: true,
        ed: true,
        rawByte: 0xc5,
      });
    });
  });

  describe("attestedCredentialData (AT flag)", () => {
    it("parses AAGUID, credentialIdLength, credentialId", () => {
      const data = buildAuthDataWithAT(0x41, 16);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.attestedCredentialData).toBeDefined();
      const acd = result.data.attestedCredentialData!;
      expect(acd.aaguid).toHaveLength(16);
      expect(Array.from(acd.aaguid)).toEqual(new Array(16).fill(0xaa));
      expect(acd.credentialIdLength).toBe(16);
      expect(acd.credentialId).toHaveLength(16);
      expect(Array.from(acd.credentialId)).toEqual(new Array(16).fill(0xbb));
    });

    it("COSE key has kty EC2 and alg ES256 (human-readable labels)", () => {
      const data = buildAuthDataWithAT(0x41);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const coseKey = result.data.attestedCredentialData!.coseKey;
      expect(coseKey.kty.raw).toBe(2);
      expect(coseKey.kty.name).toBe("EC2");
      expect(coseKey.alg.raw).toBe(-7);
      expect(coseKey.alg.name).toBe("ES256");
    });

    it("COSE key has crv P-256", () => {
      const data = buildAuthDataWithAT(0x41);
      const result = parseAuthData(data);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const coseKey = result.data.attestedCredentialData!.coseKey;
      expect(coseKey.crv).toBeDefined();
      expect(coseKey.crv?.raw).toBe(1);
      expect(coseKey.crv?.name).toBe("P-256");
    });
  });

  describe("extensions (ED flag)", () => {
    it("parses extensions CBOR after COSE key when ED=1", () => {
      const baseWithAT = buildAuthDataWithAT(0xc5); // AT=1, ED=1
      const extensionsCbor = encode({ appid: true });
      const full = new Uint8Array(baseWithAT.length + extensionsCbor.length);
      full.set(baseWithAT);
      full.set(extensionsCbor, baseWithAT.length);

      const result = parseAuthData(full);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.extensions).toBeDefined();
      expect(result.data.extensions?.appid).toBe(true);
    });
  });

  describe("error cases", () => {
    it("returns error when data is less than 37 bytes", () => {
      const tooShort = new Uint8Array(36);
      const result = parseAuthData(tooShort);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/too short/i);
    });

    it("returns error for empty input", () => {
      const result = parseAuthData(new Uint8Array(0));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/too short/i);
    });

    it("returns error when AT=1 but insufficient bytes for attested data", () => {
      // 37 bytes with AT flag but no additional data for AAGUID etc.
      const data = buildMinimalAuthData(0x41); // AT=1 but only 37 bytes
      const result = parseAuthData(data);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBeDefined();
    });
  });
});
