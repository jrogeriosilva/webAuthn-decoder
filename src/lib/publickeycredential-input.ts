/**
 * PublicKeyCredential JSON envelope detector and extractor.
 *
 * Detects when the user pastes a full PublicKeyCredential JSON response
 * (containing rawId + response.attestationObject or response.authenticatorData)
 * and extracts the relevant bytes for decoding + cross-field diagnostics (DIAG-02).
 *
 * All parsing is defensive: malformed input returns null, never throws.
 * No console.log/debug of payload bytes per T-03-05.
 */

import { base64 } from "@hexagon/base64";
import type { PublicKeyCredentialEnvelope } from "@/lib/types";

/**
 * Safely decode a base64url string to Uint8Array.
 * Returns null on any decode error.
 */
function safeBase64urlDecode(input: string): Uint8Array | null {
  try {
    if (!base64.validate(input, true)) return null;
    const ab = base64.toArrayBuffer(input, true);
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

/**
 * Try to extract a PublicKeyCredential JSON envelope from a user-pasted string.
 *
 * Returns null if the input is not a valid PublicKeyCredential JSON envelope.
 * Never throws — all errors are caught and return null.
 */
export function tryExtractPublicKeyCredential(
  input: string
): PublicKeyCredentialEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.rawId !== "string") return null;
  if (typeof obj.response !== "object" || obj.response === null) return null;

  const response = obj.response as Record<string, unknown>;

  // Decode rawId from base64url
  const rawId = safeBase64urlDecode(obj.rawId as string);
  if (!rawId) return null;

  // Determine inner payload: prefer attestationObject, fall back to authenticatorData
  let innerBytes: Uint8Array | null = null;
  let innerKind: "attestationObject" | "authenticatorData";

  if (typeof response.attestationObject === "string") {
    innerBytes = safeBase64urlDecode(response.attestationObject);
    innerKind = "attestationObject";
  } else if (typeof response.authenticatorData === "string") {
    innerBytes = safeBase64urlDecode(response.authenticatorData);
    innerKind = "authenticatorData";
  } else {
    return null;
  }

  if (!innerBytes) return null;

  // Optionally decode clientDataJSON
  let clientDataJSON: Uint8Array | undefined;
  if (typeof response.clientDataJSON === "string") {
    const decoded = safeBase64urlDecode(response.clientDataJSON);
    if (decoded) {
      clientDataJSON = decoded;
    }
    // Silently swallow decode errors per spec
  }

  return {
    rawId,
    innerBytes,
    innerKind,
    clientDataJSON,
  };
}
