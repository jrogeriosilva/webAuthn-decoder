/**
 * PublicKeyCredential JSON envelope detector and extractor.
 *
 * Detects when the user pastes a full PublicKeyCredential JSON response
 * (containing rawId + response.attestationObject or response.authenticatorData)
 * and extracts the relevant bytes for decoding.
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
  const rawIdB64 = obj.rawId as string;
  const rawId = safeBase64urlDecode(rawIdB64);
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
    if (decoded) clientDataJSON = decoded;
  }

  // Optional outer fields
  const credentialType = typeof obj.type === "string" ? obj.type : undefined;
  const authenticatorAttachment =
    typeof obj.authenticatorAttachment === "string" ? obj.authenticatorAttachment : undefined;

  const transports = Array.isArray(response.transports)
    ? (response.transports as unknown[]).filter((t): t is string => typeof t === "string")
    : undefined;

  const publicKeyAlgorithm =
    typeof response.publicKeyAlgorithm === "number" ? response.publicKeyAlgorithm : undefined;

  let publicKey: Uint8Array | undefined;
  if (typeof response.publicKey === "string") {
    const decoded = safeBase64urlDecode(response.publicKey);
    if (decoded) publicKey = decoded;
  }

  let clientExtensionResults: Record<string, unknown> | undefined;
  if (
    typeof obj.clientExtensionResults === "object" &&
    obj.clientExtensionResults !== null &&
    !Array.isArray(obj.clientExtensionResults)
  ) {
    clientExtensionResults = obj.clientExtensionResults as Record<string, unknown>;
  }

  return {
    rawId,
    rawIdB64,
    innerBytes,
    innerKind,
    clientDataJSON,
    credentialType,
    authenticatorAttachment,
    transports,
    publicKeyAlgorithm,
    publicKey,
    clientExtensionResults,
  };
}
