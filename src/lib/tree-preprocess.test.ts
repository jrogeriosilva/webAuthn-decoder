import { describe, it, expect } from "vitest";
import { bytesToDisplayHex, preprocessForTree } from "./tree-preprocess";
import type {
  DecodeResult,
  DecodedAuthData,
  AuthDataFlags,
  CoseKeyInfo,
} from "./types";

// --- Helpers ---

function makeFlags(overrides: Partial<AuthDataFlags> = {}): AuthDataFlags {
  return { up: true, uv: true, at: true, ed: false, rawByte: 0x41, ...overrides };
}

function makeCoseKey(overrides: Partial<CoseKeyInfo> = {}): CoseKeyInfo {
  return {
    kty: { raw: 2, name: "EC2" },
    alg: { raw: -7, name: "ES256" },
    crv: { raw: 1, name: "P-256" },
    rawEntries: {},
    ...overrides,
  };
}

function makeAuthData(overrides: Partial<DecodedAuthData> = {}): DecodedAuthData {
  return {
    rpIdHash: new Uint8Array(32).fill(0xab),
    flags: makeFlags(),
    signCount: 42,
    attestedCredentialData: {
      aaguid: new Uint8Array([
        0x08, 0x98, 0x70, 0x58, 0xca, 0xdc, 0x4b, 0x81, 0xb6, 0xe1, 0x30,
        0xde, 0x50, 0xdc, 0xbe, 0x96,
      ]),
      credentialId: new Uint8Array([0x01, 0x02, 0x03]),
      credentialIdLength: 3,
      coseKey: makeCoseKey(),
    },
    ...overrides,
  };
}

function makeAttResult(
  authOverrides: Partial<DecodedAuthData> = {}
): DecodeResult & { ok: true; type: "attestationObject" } {
  return {
    ok: true,
    type: "attestationObject",
    data: {
      fmt: "packed",
      authData: makeAuthData(authOverrides),
      attStmt: {},
      rawAuthData: new Uint8Array(0),
    },
  };
}

// --- bytesToDisplayHex ---

describe("bytesToDisplayHex", () => {
  it("returns full hex + byte count for <=16 bytes", () => {
    const bytes = new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4, 0xe5, 0xf6, 0xa7, 0xb8]);
    expect(bytesToDisplayHex(bytes)).toBe("a1b2c3d4e5f6a7b8 [8 bytes]");
  });

  it("returns truncated hex with ellipsis for >16 bytes", () => {
    const bytes32 = new Uint8Array(32).fill(0xab);
    const result = bytesToDisplayHex(bytes32);
    expect(result).toMatch(/^[0-9a-f]{32}\.\.\. \[32 bytes\]$/);
  });

  it("returns full hex for exactly 16 bytes (no ellipsis)", () => {
    const bytes16 = new Uint8Array(16).fill(0xcc);
    const result = bytesToDisplayHex(bytes16);
    expect(result).toBe("cccccccccccccccccccccccccccccccc [16 bytes]");
    expect(result).not.toContain("...");
  });
});

// --- preprocessForTree: attestationObject ---

describe("preprocessForTree - attestationObject", () => {
  it("formats AAGUID with arrow + name for known authenticator", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    expect(authData.aaguid).toBe(
      "08987058-cadc-4b81-b6e1-30de50dcbe96 [16 bytes] -> YubiKey 5 Series"
    );
  });

  it("formats all-zero AAGUID without arrow or name", () => {
    const result = makeAttResult({
      attestedCredentialData: {
        aaguid: new Uint8Array(16),
        credentialId: new Uint8Array([0x01]),
        credentialIdLength: 1,
        coseKey: makeCoseKey(),
      },
    });
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    expect(authData.aaguid).toBe(
      "00000000-0000-0000-0000-000000000000 [16 bytes]"
    );
  });

  it("formats COSE key fields as 'raw (name)'", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    const attCred = authData.attestedCredentialData as Record<string, unknown>;
    const coseKey = attCred.coseKey as Record<string, unknown>;
    expect(coseKey.kty).toBe("2 (EC2)");
    expect(coseKey.alg).toBe("-7 (ES256)");
    expect(coseKey.crv).toBe("1 (P-256)");
  });

  it("omits crv when undefined in CoseKeyInfo", () => {
    const result = makeAttResult({
      attestedCredentialData: {
        aaguid: new Uint8Array(16),
        credentialId: new Uint8Array([0x01]),
        credentialIdLength: 1,
        coseKey: makeCoseKey({ crv: undefined }),
      },
    });
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    const attCred = authData.attestedCredentialData as Record<string, unknown>;
    const coseKey = attCred.coseKey as Record<string, unknown>;
    expect(coseKey.crv).toBeUndefined();
  });

  it("formats flags as plain object with hex rawByte", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    const flags = authData.flags as Record<string, unknown>;
    expect(flags.up).toBe(true);
    expect(flags.uv).toBe(true);
    expect(flags.at).toBe(true);
    expect(flags.ed).toBe(false);
    expect(flags.rawByte).toBe("0x41");
  });

  it("passes signCount as plain number", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    expect(authData.signCount).toBe(42);
  });

  it("formats rpIdHash as hex-with-count string", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    const authData = tree.authData as Record<string, unknown>;
    expect(typeof authData.rpIdHash).toBe("string");
    expect(authData.rpIdHash).toContain("[32 bytes]");
  });

  it("does not include rawAuthData in tree", () => {
    const result = makeAttResult();
    const { tree } = preprocessForTree(result);
    expect(tree).not.toHaveProperty("rawAuthData");
    const authData = tree.authData as Record<string, unknown>;
    expect(authData).not.toHaveProperty("rawAuthData");
  });
});

// --- preprocessForTree: assertion ---

describe("preprocessForTree - assertion", () => {
  it("uses authenticatorData as top-level key", () => {
    const assertionResult: DecodeResult = {
      ok: true,
      type: "assertion",
      data: {
        authenticatorData: {
          rpIdHash: new Uint8Array(32).fill(0xcc),
          flags: makeFlags(),
          signCount: 5,
        },
        signature: new Uint8Array([0xaa, 0xbb, 0xcc]),
        clientDataJSON: {
          type: "webauthn.get",
          challenge: "dGVzdA",
          origin: "https://example.com",
          rawJSON: '{"type":"webauthn.get"}',
          extraFields: {},
        },
      },
    };
    const { tree } = preprocessForTree(assertionResult);
    expect(tree).toHaveProperty("authenticatorData");
    expect(tree).not.toHaveProperty("authData");

    // signature is hex-with-count
    expect(typeof tree.signature).toBe("string");
    expect(tree.signature).toContain("[3 bytes]");

    // clientDataJSON is a nested object
    const cdj = tree.clientDataJSON as Record<string, unknown>;
    expect(cdj.type).toBe("webauthn.get");
    expect(cdj.challenge).toBe("dGVzdA");
    expect(cdj.origin).toBe("https://example.com");
  });
});

// --- preprocessForTree: clientDataJSON ---

describe("preprocessForTree - clientDataJSON", () => {
  it("passes through fields directly", () => {
    const result: DecodeResult = {
      ok: true,
      type: "clientDataJSON",
      data: {
        type: "webauthn.create",
        challenge: "abc123",
        origin: "https://example.com",
        crossOrigin: false,
        rawJSON: '{"type":"webauthn.create"}',
        extraFields: { foo: "bar" },
      },
    };
    const { tree } = preprocessForTree(result);
    expect(tree.type).toBe("webauthn.create");
    expect(tree.challenge).toBe("abc123");
    expect(tree.origin).toBe("https://example.com");
    expect(tree.crossOrigin).toBe(false);
    expect(tree.rawJSON).toBe('{"type":"webauthn.create"}');
  });
});

// --- preprocessForTree: raw-cbor ---

describe("preprocessForTree - raw-cbor", () => {
  it("recursively converts Uint8Array values to hex strings", () => {
    const result: DecodeResult = {
      ok: true,
      type: "raw-cbor",
      data: {
        nested: {
          bytes: new Uint8Array([0x01, 0x02]),
        },
        topBytes: new Uint8Array([0xff]),
      },
    };
    const { tree } = preprocessForTree(result);
    const nested = (tree as Record<string, unknown>).nested as Record<string, unknown>;
    expect(nested.bytes).toBe("0102 [2 bytes]");
    expect((tree as Record<string, unknown>).topBytes).toBe("ff [1 bytes]");
  });
});

// --- preprocessForTree: error results ---

describe("preprocessForTree - error results", () => {
  it("returns empty tree for ok:false", () => {
    const result: DecodeResult = { ok: false, error: "bad input" };
    const { tree } = preprocessForTree(result);
    expect(tree).toEqual({});
  });
});
