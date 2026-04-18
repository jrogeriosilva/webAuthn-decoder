/**
 * Ceremony-aware diagnostic engine for FIDO2 decoded data.
 *
 * Pure functions that inspect DecodeResult and return DiagnosticAnnotation[]
 * with exact UI-SPEC copy for messages. No side effects, no console output.
 */

import type {
  DecodeResult,
  PayloadType,
  DiagnosticAnnotation,
} from "@/lib/types";

export interface DiagnosticContext {
  rawId?: Uint8Array;
}

/** Compare two byte arrays for equality. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Extract the flags prefix for field paths based on result type.
 * attestationObject uses "authData", assertion uses "authenticatorData".
 */
function flagsPrefix(result: DecodeResult & { ok: true }): string {
  return result.type === "assertion" ? "authenticatorData" : "authData";
}

/**
 * Check ceremony-aware flag diagnostics.
 * Only runs on attestationObject or assertion results.
 */
export function checkFlags(
  result: DecodeResult,
  payloadType: PayloadType
): DiagnosticAnnotation[] {
  if (!result.ok) return [];
  if (result.type !== "attestationObject" && result.type !== "assertion") return [];

  const flags =
    result.type === "attestationObject"
      ? result.data.authData.flags
      : result.data.authenticatorData.flags;

  const prefix = flagsPrefix(result);
  const annotations: DiagnosticAnnotation[] = [];

  if (payloadType === "registration" && !flags.at) {
    annotations.push({
      fieldPath: `${prefix}.flags.at`,
      severity: "warning",
      message:
        "AT flag is false during registration. attestedCredentialData with the new credential's public key should be present.",
    });
  }

  if (payloadType === "authentication" && !flags.up) {
    annotations.push({
      fieldPath: `${prefix}.flags.up`,
      severity: "warning",
      message:
        "UP flag is false during authentication. Most relying parties require user presence.",
    });
  }

  if (payloadType === "authentication" && !flags.uv) {
    annotations.push({
      fieldPath: `${prefix}.flags.uv`,
      severity: "warning",
      message:
        "UV flag is false during authentication. If your relying party requires user verification, this assertion will be rejected.",
    });
  }

  return annotations;
}

/**
 * Check credential ID mismatch between rawId and attestedCredentialData.credentialId.
 * Only runs on attestationObject results with attestedCredentialData present AND rawId defined.
 * Silently skips otherwise per D-09.
 */
export function checkCredentialIdMismatch(
  result: DecodeResult,
  rawId?: Uint8Array
): DiagnosticAnnotation[] {
  if (!result.ok) return [];
  if (result.type !== "attestationObject") return [];
  if (!rawId) return [];

  const attCredData = result.data.authData.attestedCredentialData;
  if (!attCredData) return [];

  if (!bytesEqual(rawId, attCredData.credentialId)) {
    return [
      {
        fieldPath: "authData.attestedCredentialData.credentialId",
        severity: "error",
        message:
          "Credential ID mismatch: rawId does not match the credentialId in attestedCredentialData. These must be identical for the registration to work correctly.",
      },
    ];
  }

  return [];
}

/**
 * Run all diagnostic checks and return combined annotations.
 */
export function runDiagnostics(
  result: DecodeResult,
  payloadType: PayloadType,
  ctx?: DiagnosticContext
): DiagnosticAnnotation[] {
  if (!result.ok) return [];

  return [
    ...checkFlags(result, payloadType),
    ...checkCredentialIdMismatch(result, ctx?.rawId),
  ];
}
