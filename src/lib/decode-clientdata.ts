import { base64 } from "@hexagon/base64";
import type { DecodedClientDataJSON } from "@/lib/types";

type DecodeClientDataResult =
  | { ok: true; data: DecodedClientDataJSON }
  | { ok: false; error: string; suggestion?: string };

/**
 * Decode a clientDataJSON payload.
 *
 * Accepts:
 * - base64url-encoded string (as returned by the WebAuthn API)
 * - raw JSON string (starts with `{`)
 * - ArrayBuffer or Uint8Array containing UTF-8 encoded JSON
 *
 * Returns a discriminated union result — never throws.
 */
export function decodeClientDataJSON(
  input: ArrayBuffer | Uint8Array | string
): DecodeClientDataResult {
  try {
    if (!input || (typeof input === "string" && input.trim() === "")) {
      return { ok: false, error: "Empty input: provide a clientDataJSON value" };
    }

    let jsonStr: string;

    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed.startsWith("{")) {
        // Raw JSON string
        jsonStr = trimmed;
      } else {
        // Attempt base64url decode
        let bytes: ArrayBuffer;
        try {
          bytes = base64.toArrayBuffer(trimmed, true);
        } catch {
          return {
            ok: false,
            error: "Failed to decode clientDataJSON: invalid base64url encoding",
          };
        }
        try {
          jsonStr = new TextDecoder().decode(bytes);
        } catch {
          return {
            ok: false,
            error: "Failed to decode clientDataJSON: could not decode bytes as UTF-8",
          };
        }
      }
    } else {
      // ArrayBuffer or Uint8Array — decode as UTF-8
      try {
        jsonStr = new TextDecoder().decode(input);
      } catch {
        return {
          ok: false,
          error: "Failed to decode clientDataJSON: could not decode bytes as UTF-8",
        };
      }
    }

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(jsonStr);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return {
          ok: false,
          error: "Failed to parse clientDataJSON: expected a JSON object",
        };
      }
      parsed = raw as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error: "Failed to parse clientDataJSON: invalid JSON",
      };
    }

    // Validate required fields
    if (!("type" in parsed)) {
      return {
        ok: false,
        error: "Missing 'type' field in clientDataJSON",
        suggestion:
          "This doesn't look like clientDataJSON — did you mean to select a different payload type?",
      };
    }

    if (!("origin" in parsed)) {
      return {
        ok: false,
        error: "Missing 'origin' field in clientDataJSON",
        suggestion:
          "This doesn't look like clientDataJSON — did you mean to select a different payload type?",
      };
    }

    // Extract known fields
    const type = String(parsed.type);
    const challenge = "challenge" in parsed ? String(parsed.challenge) : "";
    const origin = String(parsed.origin);
    const crossOrigin =
      "crossOrigin" in parsed ? Boolean(parsed.crossOrigin) : undefined;

    // Collect extra fields
    const knownFields = new Set(["type", "challenge", "origin", "crossOrigin"]);
    const extraFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!knownFields.has(key)) {
        extraFields[key] = value;
      }
    }

    const data: DecodedClientDataJSON = {
      type,
      challenge,
      origin,
      ...(crossOrigin !== undefined ? { crossOrigin } : {}),
      rawJSON: jsonStr,
      extraFields,
    };

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: `Unexpected error decoding clientDataJSON: ${(err as Error).message}`,
    };
  }
}
