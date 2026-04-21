import { decode } from "cbor-x/decode";
import type { PayloadType, DecodeResult } from "@/lib/types";
import { decodePayload } from "@/lib/decode-orchestrator";

export interface AutoDecodeResult {
  detectedType: PayloadType;
  result: DecodeResult;
}

/**
 * Inspect bytes for structural markers to identify payload type, then decode.
 *
 * Detection order:
 *  1. UTF-8 JSON with a `type` field → clientDataJSON
 *  2. CBOR object with fmt+authData+attStmt keys → registration (attestationObject)
 *  3. CBOR object with authenticatorData or signature+clientDataJSON keys → authentication
 *  4. Fallback → raw-cbor
 */
export function autoDetectAndDecode(bytes: ArrayBuffer | Uint8Array): AutoDecodeResult {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // 1. Try UTF-8 JSON — clientDataJSON is a JSON object with a `type` field
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(u8);
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as Record<string, unknown>).type === "string") {
      return { detectedType: "clientDataJSON", result: decodePayload("clientDataJSON", bytes) };
    }
  } catch {
    // not UTF-8 JSON
  }

  // 2. Probe CBOR structure without full validation
  try {
    const decoded = decode(u8);
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
      const keys = Object.keys(decoded as Record<string, unknown>);
      if (keys.includes("fmt") && keys.includes("authData") && keys.includes("attStmt")) {
        return { detectedType: "registration", result: decodePayload("registration", bytes) };
      }
      if (keys.includes("authenticatorData") || (keys.includes("signature") && keys.includes("clientDataJSON"))) {
        return { detectedType: "authentication", result: decodePayload("authentication", bytes) };
      }
    }
  } catch {
    // not valid CBOR
  }

  // 3. Fallback
  return { detectedType: "raw-cbor", result: decodePayload("raw-cbor", bytes) };
}

export function payloadTypeLabel(type: PayloadType | "publicKeyCredential"): string {
  switch (type) {
    case "registration": return "Registration (attestationObject)";
    case "authentication": return "Authentication (Assertion)";
    case "clientDataJSON": return "clientDataJSON";
    case "raw-cbor": return "Raw CBOR";
    case "publicKeyCredential": return "PublicKeyCredential";
  }
}
