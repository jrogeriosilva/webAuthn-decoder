import { base64 } from "@hexagon/base64";
import { hexToBytes } from "@/lib/hex-utils";

export type FormatResult =
  | { ok: true; format: "base64url" | "hex" | "cbor"; bytes: ArrayBuffer }
  | { ok: true; format: "json"; bytes: ArrayBuffer }
  | { ok: false; error: string };

/**
 * Attempt to validate and decode a base64url string.
 * Returns a FormatResult with format "base64url" on success, or an error.
 */
function tryBase64url(trimmed: string, reason: string): FormatResult {
  if (!base64.validate(trimmed, true)) {
    return {
      ok: false,
      error: `Invalid base64url: input contains ${reason} but is not valid base64url`,
    };
  }
  try {
    const bytes = base64.toArrayBuffer(trimmed, true);
    return { ok: true, format: "base64url", bytes };
  } catch (e) {
    return { ok: false, error: `Invalid base64url: ${(e as Error).message}` };
  }
}

/**
 * Detect whether input is base64url, hex, or invalid, and normalize to ArrayBuffer.
 *
 * Detection heuristics (ordered):
 * 0. 0x/0X prefix -> definitively hex
 * 1. Contains _ or - -> definitively base64url
 * 2. Contains [g-zG-Z] -> definitively base64url
 * 3. All chars in [0-9a-fA-F] -> hex if even length, ambiguous error if odd
 * 4. Nothing matched -> error with character position
 */
export function detectAndNormalize(input: string): FormatResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: "No input: paste or type a FIDO2 payload to begin",
    };
  }

  // Step -1: Starts with '{' -- try to parse as JSON (PublicKeyCredential envelope)
  if (trimmed.startsWith("{")) {
    try {
      JSON.parse(trimmed);
      return { ok: true, format: "json", bytes: new ArrayBuffer(0) };
    } catch {
      return { ok: false, error: "Invalid JSON: could not parse input as JSON" };
    }
  }

  // Step 0: Check for 0x/0X prefix -- definitively hex
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    try {
      const bytes = hexToBytes(trimmed);
      return { ok: true, format: "hex", bytes };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  // Step 1: Contains base64url-only chars (_ or -)? --> definitively base64url
  if (/[_\-]/.test(trimmed)) {
    return tryBase64url(trimmed, "base64url characters");
  }

  // Step 2: Contains letters outside hex range [g-zG-Z]? --> definitively base64url
  if (/[g-zG-Z]/.test(trimmed)) {
    return tryBase64url(trimmed, "non-hex alphabetic characters");
  }

  // Step 3: All chars in [0-9a-fA-F] (pure hex charset)?
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    if (trimmed.length % 2 !== 0) {
      return {
        ok: false,
        error: `Ambiguous input: ${trimmed.length} characters could be truncated hex (odd length) or short base64url. Pad with a leading zero for hex, or verify your payload is complete.`,
      };
    }
    try {
      const bytes = hexToBytes(trimmed);
      return { ok: true, format: "hex", bytes };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  // Step 4: Nothing matched -- report first unexpected character
  const firstBad = trimmed.match(/[^A-Za-z0-9_\-+/=]/);
  if (firstBad && firstBad.index !== undefined) {
    return {
      ok: false,
      error: `Unrecognized format: unexpected character '${firstBad[0]}' at position ${firstBad.index}`,
    };
  }

  return {
    ok: false,
    error: "Unrecognized format: input does not match base64url, hex, or CBOR patterns",
  };
}
