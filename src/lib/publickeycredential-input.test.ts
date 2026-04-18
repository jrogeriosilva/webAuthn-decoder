import { describe, it, expect } from "vitest";
import { tryExtractPublicKeyCredential } from "./publickeycredential-input";

// Helper: base64url encode bytes (no padding)
function toBase64url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("tryExtractPublicKeyCredential", () => {
  it("extracts attestationObject envelope from valid JSON", () => {
    const rawIdBytes = new Uint8Array([0x01, 0x02, 0x03]);
    const attestationBytes = new Uint8Array([0xa3, 0x63, 0x66, 0x6d, 0x74]); // partial CBOR
    const input = JSON.stringify({
      rawId: toBase64url(rawIdBytes),
      response: {
        attestationObject: toBase64url(attestationBytes),
      },
    });

    const envelope = tryExtractPublicKeyCredential(input);
    expect(envelope).not.toBeNull();
    expect(envelope!.innerKind).toBe("attestationObject");
    expect(new Uint8Array(envelope!.rawId)).toEqual(rawIdBytes);
    expect(new Uint8Array(envelope!.innerBytes)).toEqual(attestationBytes);
  });

  it("extracts authenticatorData envelope when no attestationObject", () => {
    const rawIdBytes = new Uint8Array([0x04, 0x05]);
    const authDataBytes = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const sigBytes = new Uint8Array([0xdd, 0xee]);
    const input = JSON.stringify({
      rawId: toBase64url(rawIdBytes),
      response: {
        authenticatorData: toBase64url(authDataBytes),
        signature: toBase64url(sigBytes),
      },
    });

    const envelope = tryExtractPublicKeyCredential(input);
    expect(envelope).not.toBeNull();
    expect(envelope!.innerKind).toBe("authenticatorData");
    expect(new Uint8Array(envelope!.innerBytes)).toEqual(authDataBytes);
  });

  it("returns null for non-JSON input", () => {
    expect(tryExtractPublicKeyCredential("not json at all")).toBeNull();
    expect(tryExtractPublicKeyCredential("")).toBeNull();
    expect(tryExtractPublicKeyCredential("{ broken")).toBeNull();
  });

  it("returns null for JSON missing rawId or response", () => {
    expect(tryExtractPublicKeyCredential(JSON.stringify({ foo: "bar" }))).toBeNull();
    expect(tryExtractPublicKeyCredential(JSON.stringify({ rawId: "abc" }))).toBeNull();
    expect(tryExtractPublicKeyCredential(JSON.stringify({ response: {} }))).toBeNull();
  });

  it("carries clientDataJSON through when present", () => {
    const rawIdBytes = new Uint8Array([0x01]);
    const attestationBytes = new Uint8Array([0xa3]);
    const clientDataBytes = new Uint8Array([0x7b, 0x7d]); // "{}"
    const input = JSON.stringify({
      rawId: toBase64url(rawIdBytes),
      response: {
        attestationObject: toBase64url(attestationBytes),
        clientDataJSON: toBase64url(clientDataBytes),
      },
    });

    const envelope = tryExtractPublicKeyCredential(input);
    expect(envelope).not.toBeNull();
    expect(envelope!.clientDataJSON).toBeDefined();
    expect(new Uint8Array(envelope!.clientDataJSON!)).toEqual(clientDataBytes);
  });

  it("returns null for malformed base64url in rawId", () => {
    const input = JSON.stringify({
      rawId: "!!!invalid-base64!!!",
      response: {
        attestationObject: "AQID",
      },
    });

    const envelope = tryExtractPublicKeyCredential(input);
    expect(envelope).toBeNull();
  });
});
