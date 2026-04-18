/**
 * attestationObject CBOR decoder.
 *
 * attestationObject is a CBOR-encoded map (top-level registration payload).
 * Structure (after CBOR decode):
 *   - fmt:      string  — attestation statement format identifier
 *   - authData: bytes   — authenticatorData binary struct (NOT CBOR)
 *   - attStmt:  map     — attestation statement (format-specific content)
 *
 * This decoder:
 *   1. CBOR-decodes the raw bytes using cbor-x
 *   2. Validates required fields (fmt, authData)
 *   3. Delegates authData parsing to parseAuthData
 *   4. Returns a fully typed DecodedAttestationObject or an error result
 *
 * Security: T-02-03 — CBOR decode is wrapped in try/catch to handle
 * malicious payloads that could trigger memory exhaustion in cbor-x.
 */

import { decode } from "cbor-x/decode";
import { parseAuthData } from "@/lib/decode-authdata";
import type { DecodedAttestationObject } from "@/lib/types";

const MISSING_FIELD_SUGGESTION =
  "This doesn't look like an attestationObject — did you mean to select a different payload type?";

/**
 * Decode a raw attestationObject CBOR payload.
 *
 * Returns { ok: false, error, suggestion? } on any failure — never throws.
 */
export function decodeAttestationObject(
  bytes: ArrayBuffer | Uint8Array
): { ok: true; data: DecodedAttestationObject } | { ok: false; error: string; suggestion?: string } {
  // --- 1. CBOR decode (T-02-03: wrapped in try/catch) ---
  let decoded: unknown;
  try {
    // Use the Uint8Array view directly (preserves byteOffset/byteLength).
    // For a plain ArrayBuffer, wrap it; cbor-x decode accepts Uint8Array.
    const input =
      bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
    decoded = decode(input);
  } catch (e) {
    return {
      ok: false,
      error: `Failed to decode CBOR: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // --- 2. Normalise decoded value to a plain object ---
  // cbor-x returns a Map for CBOR maps with mixed/integer keys,
  // or a plain object when keys are strings.
  let obj: Record<string, unknown>;
  if (decoded instanceof Map) {
    obj = Object.fromEntries(decoded.entries()) as Record<string, unknown>;
  } else if (decoded !== null && typeof decoded === "object" && !Array.isArray(decoded)) {
    obj = decoded as Record<string, unknown>;
  } else {
    return {
      ok: false,
      error: "Decoded CBOR is not a map — attestationObject must be a CBOR map",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // --- 3. Validate required fields ---
  if (obj["fmt"] === undefined || obj["fmt"] === null) {
    return {
      ok: false,
      error: "Missing 'fmt' field in attestationObject",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  if (obj["authData"] === undefined || obj["authData"] === null) {
    return {
      ok: false,
      error: "Missing 'authData' field in attestationObject",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // --- 4. Extract and type-check fields ---
  const fmt = String(obj["fmt"]);

  // authData must be bytes (Uint8Array from cbor-x, or Buffer in Node)
  const rawAuthDataValue = obj["authData"];
  let rawAuthData: Uint8Array;
  if (rawAuthDataValue instanceof Uint8Array) {
    rawAuthData = rawAuthDataValue;
  } else if (
    rawAuthDataValue instanceof ArrayBuffer ||
    (ArrayBuffer.isView(rawAuthDataValue) && !(rawAuthDataValue instanceof DataView))
  ) {
    rawAuthData = new Uint8Array(rawAuthDataValue as ArrayBuffer);
  } else {
    return {
      ok: false,
      error: "Field 'authData' is not a byte array in attestationObject",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // attStmt defaults to empty map if absent
  const attStmtValue = obj["attStmt"];
  let attStmt: Record<string, unknown>;
  if (attStmtValue instanceof Map) {
    attStmt = Object.fromEntries(attStmtValue.entries()) as Record<string, unknown>;
  } else if (attStmtValue !== null && typeof attStmtValue === "object" && !Array.isArray(attStmtValue)) {
    attStmt = attStmtValue as Record<string, unknown>;
  } else {
    attStmt = {};
  }

  // --- 5. Parse authenticatorData binary struct ---
  const authDataResult = parseAuthData(rawAuthData);
  if (!authDataResult.ok) {
    return {
      ok: false,
      error: authDataResult.error,
    };
  }

  // --- 6. Return fully typed result ---
  return {
    ok: true,
    data: {
      fmt,
      authData: authDataResult.data,
      attStmt,
      rawAuthData,
    },
  };
}
