/**
 * authenticatorData binary parser.
 *
 * authenticatorData is a binary struct — NOT CBOR. Structure:
 *   - Bytes 0-31:  rpIdHash (32 bytes)
 *   - Byte  32:    flags (1 byte)
 *   - Bytes 33-36: signCount (4 bytes big-endian uint32)
 *   - [optional]   attestedCredentialData if AT flag (bit 6) is set
 *   - [optional]   extensions CBOR if ED flag (bit 7) is set
 *
 * attestedCredentialData structure:
 *   - 16 bytes: AAGUID
 *   - 2 bytes:  credentialIdLength (big-endian uint16)
 *   - N bytes:  credentialId (N = credentialIdLength)
 *   - remaining: CBOR-encoded COSE public key
 *
 * Security: T-02-04 — credentialIdLength is validated against buffer bounds
 * before reading. Any out-of-bounds access returns an error result, never throws.
 */

import { decode, decodeMultiple } from "cbor-x";
import { resolveCoseKey } from "@/lib/cose-map";
import type { DecodedAuthData, AuthDataFlags } from "@/lib/types";

/** Parse the flags byte into boolean fields. */
function parseFlags(flagsByte: number): AuthDataFlags {
  return {
    up: (flagsByte & 0x01) !== 0, // bit 0
    uv: (flagsByte & 0x04) !== 0, // bit 2
    at: (flagsByte & 0x40) !== 0, // bit 6
    ed: (flagsByte & 0x80) !== 0, // bit 7
    rawByte: flagsByte,
  };
}

/**
 * Convert a cbor-x decoded value (Map or plain object) to a Record.
 * cbor-x returns Map for integer-keyed CBOR maps, plain object for string keys.
 */
function toRecord(value: unknown): Record<number | string, unknown> | null {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries()) as Record<number | string, unknown>;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<number | string, unknown>;
  }
  return null;
}

/**
 * Parse raw authenticatorData bytes into a structured DecodedAuthData.
 *
 * Returns { ok: false, error: string } on any parse failure — never throws.
 */
export function parseAuthData(
  data: ArrayBuffer | Uint8Array
): { ok: true; data: DecodedAuthData } | { ok: false; error: string } {
  try {
    const bytes =
      data instanceof Uint8Array ? data : new Uint8Array(data);

    // Minimum length: 32 (rpIdHash) + 1 (flags) + 4 (signCount) = 37
    if (bytes.length < 37) {
      return {
        ok: false,
        error: `authenticatorData too short: expected at least 37 bytes, got ${bytes.length}`,
      };
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // rpIdHash: bytes 0–31
    const rpIdHash = bytes.slice(0, 32);

    // flags: byte 32
    const flagsByte = view.getUint8(32);
    const flags = parseFlags(flagsByte);

    // signCount: bytes 33–36, big-endian uint32
    const signCount = view.getUint32(33, false);

    let offset = 37;
    let attestedCredentialData: DecodedAuthData["attestedCredentialData"];
    let extensions: Record<string, unknown> | undefined;

    // --- Attested Credential Data (AT flag) ---
    if (flags.at) {
      // Need at least: 16 (AAGUID) + 2 (credIdLen) = 18 bytes after offset
      if (offset + 18 > bytes.length) {
        return {
          ok: false,
          error: `authenticatorData too short for attestedCredentialData: need at least ${offset + 18} bytes, got ${bytes.length}`,
        };
      }

      // AAGUID: 16 bytes
      const aaguid = bytes.slice(offset, offset + 16);
      offset += 16;

      // credentialIdLength: 2 bytes big-endian
      const credentialIdLength = view.getUint16(offset, false);
      offset += 2;

      // Validate credentialId bounds (T-02-04)
      if (offset + credentialIdLength > bytes.length) {
        return {
          ok: false,
          error: `authenticatorData too short for credentialId: credentialIdLength=${credentialIdLength} exceeds buffer at offset ${offset}`,
        };
      }

      // credentialId: credentialIdLength bytes
      const credentialId = bytes.slice(offset, offset + credentialIdLength);
      offset += credentialIdLength;

      // COSE key: CBOR-encoded, starts at offset.
      // If ED flag is also set, extensions CBOR follows the COSE key.
      // Use decodeMultiple to decode all CBOR items in the remaining slice —
      // the first item is the COSE key, the second (if any) is extensions.
      if (offset >= bytes.length) {
        return {
          ok: false,
          error: "authenticatorData too short: no bytes remaining for COSE key",
        };
      }

      const remainingSlice = bytes.slice(offset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cborItems: any[];
      try {
        if (flags.ed) {
          // decodeMultiple handles multiple concatenated CBOR items in one buffer
          cborItems = decodeMultiple(remainingSlice) as unknown[];
        } else {
          // Single item: the COSE key only
          cborItems = [decode(remainingSlice)];
        }
      } catch (e) {
        return {
          ok: false,
          error: `Failed to decode COSE key CBOR: ${e instanceof Error ? e.message : String(e)}`,
        };
      }

      if (cborItems.length === 0) {
        return {
          ok: false,
          error: "COSE key decoded to empty result",
        };
      }

      const coseRecord = toRecord(cborItems[0]);
      if (coseRecord === null) {
        return {
          ok: false,
          error: "COSE key decoded to unexpected type (not a map)",
        };
      }

      const coseKey = resolveCoseKey(coseRecord);
      attestedCredentialData = { aaguid, credentialId, credentialIdLength, coseKey };

      // If extensions were decoded as the second item, extract them here
      if (flags.ed && cborItems.length >= 2) {
        const extRecord = toRecord(cborItems[1]);
        if (extRecord !== null) {
          extensions = extRecord as Record<string, unknown>;
        }
      }
    } else if (flags.ed && offset < bytes.length) {
      // ED set but AT not set — extensions follow immediately after signCount
      const extSlice = bytes.slice(offset);
      try {
        const rawExt = decode(extSlice);
        const extRecord = toRecord(rawExt);
        if (extRecord !== null) {
          extensions = extRecord as Record<string, unknown>;
        }
      } catch {
        // Extensions parse failure is non-fatal
        extensions = undefined;
      }
    }

    return {
      ok: true,
      data: {
        rpIdHash,
        flags,
        signCount,
        ...(attestedCredentialData !== undefined ? { attestedCredentialData } : {}),
        ...(extensions !== undefined ? { extensions } : {}),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: `Failed to parse authenticatorData: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
