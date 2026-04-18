/**
 * Decode orchestrator.
 *
 * Routes a PayloadType + raw bytes to the correct decoder and returns
 * a typed DecodeResult. This is the single entry point for all decode
 * operations from the UI layer.
 *
 * Routing table:
 *   "registration"   → decodeAttestationObject (attestationObject CBOR)
 *   "authentication" → decodeAssertion (assertion response CBOR)
 *   "clientDataJSON" → decodeClientDataJSON (base64url-encoded JSON or UTF-8 bytes)
 *   "raw-cbor"       → raw cbor-x decode (unknown structure)
 *
 * Type mismatch errors (D-03): Individual decoders return suggestion strings
 * when required fields are missing. The orchestrator passes these through
 * without additional detection logic — delegation keeps this clean.
 *
 * Security:
 *   T-02-09: All decoded values reach OutputArea via JSON.stringify which
 *   uses React's built-in XSS protection (no dangerouslySetInnerHTML).
 *   T-02-10: Each decoder wraps cbor-x calls in try/catch. Malformed input
 *   returns error result, never throws. useEffect dependency array in App
 *   prevents infinite re-render loops.
 */

import { decodeAttestationObject } from "@/lib/decode-attestation";
import { decodeAssertion } from "@/lib/decode-assertion";
import { decodeClientDataJSON } from "@/lib/decode-clientdata";
import { decode } from "cbor-x/decode";
import type { PayloadType, DecodeResult } from "@/lib/types";

/**
 * Route a payload type + raw bytes to the correct decoder.
 *
 * Always returns a DecodeResult — never throws.
 */
export function decodePayload(
  payloadType: PayloadType,
  bytes: ArrayBuffer | Uint8Array
): DecodeResult {
  switch (payloadType) {
    case "registration": {
      const result = decodeAttestationObject(bytes);
      if (!result.ok) {
        return result;
      }
      return { ok: true, type: "attestationObject", data: result.data };
    }

    case "authentication": {
      const result = decodeAssertion(bytes);
      if (!result.ok) {
        return result;
      }
      return { ok: true, type: "assertion", data: result.data };
    }

    case "clientDataJSON": {
      const result = decodeClientDataJSON(bytes);
      if (!result.ok) {
        return result;
      }
      return { ok: true, type: "clientDataJSON", data: result.data };
    }

    case "raw-cbor": {
      try {
        const input =
          bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const decoded = decode(input);
        return { ok: true, type: "raw-cbor", data: decoded };
      } catch (e) {
        return {
          ok: false,
          error: `Failed to decode CBOR: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    default: {
      // TypeScript exhaustiveness check — payloadType is never at this point
      const exhaustive: never = payloadType;
      return {
        ok: false,
        error: `Unknown payload type: ${String(exhaustive)}`,
      };
    }
  }
}
