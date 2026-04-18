import { describe, it, expect } from "vitest";
import { runDiagnostics, checkFlags, checkCredentialIdMismatch } from "./diagnostics";
import type { DecodeResult, DecodedAuthData, AuthDataFlags, CoseKeyInfo } from "./types";

function makeFlags(overrides: Partial<AuthDataFlags> = {}): AuthDataFlags {
  return { up: true, uv: true, at: true, ed: false, rawByte: 0x45, ...overrides };
}

function makeCoseKey(): CoseKeyInfo {
  return { kty: { raw: 2, name: "EC2" }, alg: { raw: -7, name: "ES256" }, crv: { raw: 1, name: "P-256" }, rawEntries: {} };
}

function makeAuthData(overrides: Partial<DecodedAuthData> = {}): DecodedAuthData {
  return {
    rpIdHash: new Uint8Array(32),
    flags: makeFlags(),
    signCount: 0,
    attestedCredentialData: {
      aaguid: new Uint8Array(16),
      credentialId: new Uint8Array([0x01, 0x02, 0x03]),
      credentialIdLength: 3,
      coseKey: makeCoseKey(),
    },
    ...overrides,
  };
}

function makeAttestationResult(authDataOverrides: Partial<DecodedAuthData> = {}): DecodeResult & { ok: true; type: "attestationObject" } {
  return {
    ok: true,
    type: "attestationObject",
    data: {
      fmt: "packed",
      authData: makeAuthData(authDataOverrides),
      attStmt: {},
      rawAuthData: new Uint8Array(0),
    },
  };
}

function makeAssertionResult(flagOverrides: Partial<AuthDataFlags> = {}): DecodeResult & { ok: true; type: "assertion" } {
  return {
    ok: true,
    type: "assertion",
    data: {
      authenticatorData: {
        rpIdHash: new Uint8Array(32),
        flags: makeFlags(flagOverrides),
        signCount: 1,
      },
      signature: new Uint8Array([0xaa, 0xbb]),
      clientDataJSON: {
        type: "webauthn.get",
        challenge: "dGVzdA",
        origin: "https://example.com",
        rawJSON: "{}",
        extraFields: {},
      },
    },
  };
}

describe("checkFlags", () => {
  it("warns when AT=false during registration", () => {
    const result = makeAttestationResult({ flags: makeFlags({ at: false }) });
    const annotations = checkFlags(result, "registration");
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toEqual({
      fieldPath: "authData.flags.at",
      severity: "warning",
      message: "AT flag is false during registration. attestedCredentialData with the new credential's public key should be present.",
    });
  });

  it("warns when UP=false during authentication", () => {
    const result = makeAssertionResult({ up: false });
    const annotations = checkFlags(result, "authentication");
    expect(annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: "authenticatorData.flags.up",
          severity: "warning",
          message: "UP flag is false during authentication. Most relying parties require user presence.",
        }),
      ])
    );
  });

  it("warns when UV=false during authentication", () => {
    const result = makeAssertionResult({ uv: false });
    const annotations = checkFlags(result, "authentication");
    expect(annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: "authenticatorData.flags.uv",
          severity: "warning",
          message: "UV flag is false during authentication. If your relying party requires user verification, this assertion will be rejected.",
        }),
      ])
    );
  });

  it("returns zero annotations when all flags are fine for registration", () => {
    const result = makeAttestationResult();
    const annotations = checkFlags(result, "registration");
    expect(annotations).toHaveLength(0);
  });

  it("returns zero annotations for clientDataJSON results", () => {
    const result: DecodeResult = {
      ok: true,
      type: "clientDataJSON",
      data: { type: "webauthn.create", challenge: "dGVzdA", origin: "https://example.com", rawJSON: "{}", extraFields: {} },
    };
    const annotations = checkFlags(result, "clientDataJSON");
    expect(annotations).toHaveLength(0);
  });

  it("returns zero annotations for raw-cbor results", () => {
    const result: DecodeResult = { ok: true, type: "raw-cbor", data: {} };
    const annotations = checkFlags(result, "raw-cbor");
    expect(annotations).toHaveLength(0);
  });
});

describe("checkCredentialIdMismatch", () => {
  it("returns no annotation when credential IDs match", () => {
    const result = makeAttestationResult();
    const rawId = new Uint8Array([0x01, 0x02, 0x03]);
    const annotations = checkCredentialIdMismatch(result, rawId);
    expect(annotations).toHaveLength(0);
  });

  it("returns error annotation when credential IDs differ", () => {
    const result = makeAttestationResult();
    const rawId = new Uint8Array([0x01, 0x02, 0x04]);
    const annotations = checkCredentialIdMismatch(result, rawId);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toEqual({
      fieldPath: "authData.attestedCredentialData.credentialId",
      severity: "error",
      message: "Credential ID mismatch: rawId does not match the credentialId in attestedCredentialData. These must be identical for the registration to work correctly.",
    });
  });

  it("silently skips when rawId is undefined", () => {
    const result = makeAttestationResult();
    const annotations = checkCredentialIdMismatch(result, undefined);
    expect(annotations).toHaveLength(0);
  });

  it("silently skips when result has no attestedCredentialData", () => {
    const result = makeAttestationResult({ attestedCredentialData: undefined });
    const rawId = new Uint8Array([0x01, 0x02, 0x03]);
    const annotations = checkCredentialIdMismatch(result, rawId);
    expect(annotations).toHaveLength(0);
  });
});

describe("runDiagnostics", () => {
  it("combines flag and mismatch diagnostics", () => {
    const result = makeAttestationResult({ flags: makeFlags({ at: false }) });
    const rawId = new Uint8Array([0x01, 0x02, 0x04]); // mismatch
    const annotations = runDiagnostics(result, "registration", { rawId });
    expect(annotations).toHaveLength(2);
    expect(annotations.map((a) => a.fieldPath)).toContain("authData.flags.at");
    expect(annotations.map((a) => a.fieldPath)).toContain("authData.attestedCredentialData.credentialId");
  });

  it("returns empty array for error-shaped results", () => {
    const result: DecodeResult = { ok: false, error: "bad input" };
    const annotations = runDiagnostics(result, "registration");
    expect(annotations).toEqual([]);
  });
});
