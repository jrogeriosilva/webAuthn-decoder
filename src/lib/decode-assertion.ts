/**
 * Assertion response CBOR decoder.
 *
 * An assertion response is a CBOR-encoded map containing the fields returned
 * by navigator.credentials.get() authenticatorResponse during authentication:
 *   - authenticatorData: Uint8Array — same binary struct as registration authData
 *   - signature:         Uint8Array — DER-encoded ECDSA (or similar) signature
 *   - clientDataJSON:    string     — base64url-encoded JSON (same as registration)
 *   - userHandle:        Uint8Array — optional user ID, present if resident key
 *
 * This decoder:
 *   1. CBOR-decodes the raw bytes using cbor-x
 *   2. Validates required fields (authenticatorData, signature, clientDataJSON)
 *   3. Delegates authenticatorData parsing to parseAuthData
 *   4. Delegates clientDataJSON decoding to decodeClientDataJSON
 *   5. Returns a fully typed DecodedAssertion or an error result
 *
 * Security: T-02-10 — CBOR decode is wrapped in try/catch to handle
 * malformed or adversarial payloads.
 */

import { decode } from "cbor-x/decode";
import { parseAuthData } from "@/lib/decode-authdata";
import { decodeClientDataJSON } from "@/lib/decode-clientdata";
import type { DecodedAssertion } from "@/lib/types";

const MISSING_FIELD_SUGGESTION =
  "This doesn't look like an assertion response — did you mean to select Registration?";

/**
 * Decode a raw assertion response CBOR payload.
 *
 * Returns { ok: false, error, suggestion? } on any failure — never throws.
 */
export function decodeAssertion(
  bytes: ArrayBuffer | Uint8Array
): { ok: true; data: DecodedAssertion } | { ok: false; error: string; suggestion?: string } {
  // --- 1. CBOR decode (T-02-10: wrapped in try/catch) ---
  let decoded: unknown;
  try {
    const input =
      bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
    decoded = decode(input);
  } catch (e) {
    return {
      ok: false,
      error: `Failed to decode assertion CBOR: ${e instanceof Error ? e.message : String(e)}`,
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
      error: "Decoded CBOR is not a map — assertion response must be a CBOR map",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // --- 3. Validate and extract required fields ---

  // authenticatorData (required)
  if (obj["authenticatorData"] === undefined || obj["authenticatorData"] === null) {
    return {
      ok: false,
      error: "Missing 'authenticatorData' field in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  let authenticatorDataBytes: Uint8Array;
  const rawAuthDataValue = obj["authenticatorData"];
  if (rawAuthDataValue instanceof Uint8Array) {
    authenticatorDataBytes = rawAuthDataValue;
  } else if (
    rawAuthDataValue instanceof ArrayBuffer ||
    (ArrayBuffer.isView(rawAuthDataValue) && !(rawAuthDataValue instanceof DataView))
  ) {
    authenticatorDataBytes = new Uint8Array(rawAuthDataValue as ArrayBuffer);
  } else {
    return {
      ok: false,
      error: "Field 'authenticatorData' is not a byte array in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // signature (required)
  if (obj["signature"] === undefined || obj["signature"] === null) {
    return {
      ok: false,
      error: "Missing 'signature' field in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  let signature: Uint8Array;
  const rawSigValue = obj["signature"];
  if (rawSigValue instanceof Uint8Array) {
    signature = rawSigValue;
  } else if (
    rawSigValue instanceof ArrayBuffer ||
    (ArrayBuffer.isView(rawSigValue) && !(rawSigValue instanceof DataView))
  ) {
    signature = new Uint8Array(rawSigValue as ArrayBuffer);
  } else {
    return {
      ok: false,
      error: "Field 'signature' is not a byte array in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // clientDataJSON (required) — string (base64url) or Uint8Array
  if (obj["clientDataJSON"] === undefined || obj["clientDataJSON"] === null) {
    return {
      ok: false,
      error: "Missing 'clientDataJSON' field in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  const clientDataJSONRaw = obj["clientDataJSON"];
  let clientDataJSONInput: string | Uint8Array;
  if (typeof clientDataJSONRaw === "string") {
    clientDataJSONInput = clientDataJSONRaw;
  } else if (clientDataJSONRaw instanceof Uint8Array) {
    clientDataJSONInput = clientDataJSONRaw;
  } else if (
    clientDataJSONRaw instanceof ArrayBuffer ||
    (ArrayBuffer.isView(clientDataJSONRaw) && !(clientDataJSONRaw instanceof DataView))
  ) {
    clientDataJSONInput = new Uint8Array(clientDataJSONRaw as ArrayBuffer);
  } else {
    return {
      ok: false,
      error: "Field 'clientDataJSON' has unexpected type in assertion response",
      suggestion: MISSING_FIELD_SUGGESTION,
    };
  }

  // userHandle (optional)
  let userHandle: Uint8Array | undefined;
  if (obj["userHandle"] !== undefined && obj["userHandle"] !== null) {
    const rawUserHandle = obj["userHandle"];
    if (rawUserHandle instanceof Uint8Array) {
      userHandle = rawUserHandle;
    } else if (
      rawUserHandle instanceof ArrayBuffer ||
      (ArrayBuffer.isView(rawUserHandle) && !(rawUserHandle instanceof DataView))
    ) {
      userHandle = new Uint8Array(rawUserHandle as ArrayBuffer);
    }
    // If it's some other type, silently ignore (non-critical field)
  }

  // --- 4. Parse authenticatorData via parseAuthData ---
  const authDataResult = parseAuthData(authenticatorDataBytes);
  if (!authDataResult.ok) {
    return {
      ok: false,
      error: authDataResult.error,
    };
  }

  // --- 5. Decode clientDataJSON via decodeClientDataJSON ---
  const clientDataResult = decodeClientDataJSON(clientDataJSONInput);
  if (!clientDataResult.ok) {
    return {
      ok: false,
      error: clientDataResult.error,
      suggestion: clientDataResult.suggestion,
    };
  }

  // --- 6. Return fully typed result ---
  return {
    ok: true,
    data: {
      authenticatorData: authDataResult.data,
      signature,
      clientDataJSON: clientDataResult.data,
      ...(userHandle !== undefined ? { userHandle } : {}),
    },
  };
}
