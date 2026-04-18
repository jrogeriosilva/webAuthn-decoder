import type { CoseKeyInfo } from "./types";

/**
 * COSE algorithm integer-to-name map.
 * Covers the ~20 most common values used in real-world WebAuthn deployments.
 * Source: IANA COSE Algorithms registry (https://www.iana.org/assignments/cose/cose.xhtml)
 */
const ALG_MAP: Record<number, string> = {
  [-7]: "ES256",
  [-35]: "ES384",
  [-36]: "ES512",
  [-8]: "EdDSA",
  [-257]: "RS256",
  [-258]: "RS384",
  [-259]: "RS512",
  [-65535]: "RS1",
  [-37]: "PS256",
  [-38]: "PS384",
  [-39]: "PS512",
  4: "HMAC 256/64",
  5: "HMAC 256/256",
  6: "HMAC 384/384",
  7: "HMAC 512/512",
};

/**
 * COSE key type integer-to-name map.
 * Source: IANA COSE Key Types registry.
 */
const KTY_MAP: Record<number, string> = {
  1: "OKP",
  2: "EC2",
  3: "RSA",
  4: "Symmetric",
};

/**
 * COSE elliptic curve integer-to-name map.
 * Source: IANA COSE Elliptic Curves registry.
 */
const CRV_MAP: Record<number, string> = {
  1: "P-256",
  2: "P-384",
  3: "P-521",
  4: "X25519",
  5: "X448",
  6: "Ed25519",
  7: "Ed448",
  8: "secp256k1",
};

/**
 * Resolve a COSE algorithm integer to a human-readable name.
 * Unknown integers return { raw, name: "unknown" } per D-05.
 */
export function resolveAlg(raw: number): { raw: number; name: string } {
  return { raw, name: ALG_MAP[raw] ?? "unknown" };
}

/**
 * Resolve a COSE key type integer to a human-readable name.
 * Unknown integers return { raw, name: "unknown" } per D-05.
 */
export function resolveKty(raw: number): { raw: number; name: string } {
  return { raw, name: KTY_MAP[raw] ?? "unknown" };
}

/**
 * Resolve a COSE curve integer to a human-readable name.
 * Unknown integers return { raw, name: "unknown" } per D-05.
 */
export function resolveCrv(raw: number): { raw: number; name: string } {
  return { raw, name: CRV_MAP[raw] ?? "unknown" };
}

/**
 * Resolve a raw COSE key map (integer-keyed) into a CoseKeyInfo structure.
 *
 * COSE key integer labels:
 *   1  = kty (key type)
 *   3  = alg (algorithm)
 *  -1  = crv (curve, only present for EC2/OKP keys)
 *
 * All raw entries are preserved in rawEntries for full transparency.
 * Never throws — unknown values display with "unknown" label.
 */
export function resolveCoseKey(coseMap: Record<number | string, unknown>): CoseKeyInfo {
  const ktyRaw = typeof coseMap[1] === "number" ? (coseMap[1] as number) : 0;
  const algRaw = typeof coseMap[3] === "number" ? (coseMap[3] as number) : 0;
  const crvRaw = coseMap[-1] !== undefined ? coseMap[-1] : coseMap["-1"];

  const kty = resolveKty(ktyRaw);
  const alg = resolveAlg(algRaw);

  // crv is optional — only EC2 and OKP keys have a curve parameter
  const crv =
    crvRaw !== undefined && typeof crvRaw === "number"
      ? resolveCrv(crvRaw)
      : undefined;

  // Preserve all raw entries as numeric keys for transparency
  const rawEntries: Record<number, unknown> = {};
  for (const [k, v] of Object.entries(coseMap)) {
    rawEntries[Number(k)] = v;
  }

  return { kty, alg, ...(crv !== undefined ? { crv } : {}), rawEntries };
}
