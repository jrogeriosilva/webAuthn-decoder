/**
 * Shared decoder result types for Phase 2 decoders.
 * Pure type definitions — no implementation logic.
 */

/** Payload types the user can select for decoding. */
export type PayloadType = "registration" | "authentication" | "clientDataJSON" | "raw-cbor";

/** COSE key type, algorithm, and curve info with human-readable names. */
export interface CoseKeyInfo {
  kty: { raw: number; name: string };  // e.g., { raw: 2, name: "EC2" }
  alg: { raw: number; name: string };  // e.g., { raw: -7, name: "ES256" }
  crv?: { raw: number; name: string }; // e.g., { raw: 1, name: "P-256" }
  rawEntries: Record<number, unknown>; // all raw COSE key entries for full transparency
}

/** Parsed authenticatorData flags byte. */
export interface AuthDataFlags {
  up: boolean;   // User Present (bit 0)
  uv: boolean;   // User Verified (bit 2)
  at: boolean;   // Attested Credential Data (bit 6)
  ed: boolean;   // Extension Data (bit 7)
  rawByte: number; // The raw flags byte value
}

/** Parsed authenticatorData binary structure. */
export interface DecodedAuthData {
  rpIdHash: Uint8Array;       // 32 bytes
  flags: AuthDataFlags;
  signCount: number;          // 4 bytes big-endian
  attestedCredentialData?: {
    aaguid: Uint8Array;       // 16 bytes
    credentialId: Uint8Array; // variable length
    credentialIdLength: number;
    coseKey: CoseKeyInfo;
  };
  extensions?: Record<string, unknown>; // CBOR-decoded extensions if ED flag set
}

/** Parsed attestationObject (top-level CBOR registration payload). */
export interface DecodedAttestationObject {
  fmt: string;
  authData: DecodedAuthData;
  attStmt: Record<string, unknown>;
  rawAuthData: Uint8Array; // raw authData bytes before parsing
}

/** Parsed clientDataJSON (base64url-encoded JSON string). */
export interface DecodedClientDataJSON {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
  rawJSON: string; // the raw JSON string before parsing
  extraFields: Record<string, unknown>; // any non-standard fields
}

/** Parsed assertion response (authenticatorData + signature + clientDataJSON). */
export interface DecodedAssertion {
  authenticatorData: DecodedAuthData;
  signature: Uint8Array;
  clientDataJSON: DecodedClientDataJSON;
  userHandle?: Uint8Array;
}

/** Discriminated union result from any decoder. */
export type DecodeResult =
  | { ok: true; type: "attestationObject"; data: DecodedAttestationObject }
  | { ok: true; type: "authenticatorData"; data: DecodedAuthData }
  | { ok: true; type: "clientDataJSON"; data: DecodedClientDataJSON }
  | { ok: true; type: "assertion"; data: DecodedAssertion }
  | { ok: true; type: "raw-cbor"; data: unknown }
  | { ok: false; error: string; suggestion?: string };

/** A diagnostic finding tied to a specific field path in the decoded tree. */
export interface DiagnosticAnnotation {
  fieldPath: string;
  severity: "warning" | "error";
  message: string;
}

/** Preprocessed tree data ready for react-json-view-lite rendering. */
export interface TreeData {
  tree: Record<string, unknown>;
  annotations: DiagnosticAnnotation[];
}

/** Extracted fields from a PublicKeyCredential JSON envelope. */
export interface PublicKeyCredentialEnvelope {
  rawId: Uint8Array;
  innerBytes: Uint8Array;
  innerKind: "attestationObject" | "authenticatorData";
  clientDataJSON?: Uint8Array;
}
