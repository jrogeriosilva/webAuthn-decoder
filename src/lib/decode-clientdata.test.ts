import { describe, it, expect } from "vitest";
import { base64 } from "@hexagon/base64";
import { decodeClientDataJSON } from "./decode-clientdata";

// Helper to base64url-encode a JSON string
function encodeJson(obj: object): string {
  const jsonStr = JSON.stringify(obj);
  return base64.fromArrayBuffer(new TextEncoder().encode(jsonStr).buffer as ArrayBuffer, true);
}

describe("decodeClientDataJSON", () => {
  describe("base64url-encoded input", () => {
    it("decodes base64url-encoded webauthn.create clientDataJSON", () => {
      const encoded = encodeJson({
        type: "webauthn.create",
        challenge: "dGVzdA",
        origin: "https://example.com",
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.type).toBe("webauthn.create");
      expect(result.data.challenge).toBe("dGVzdA");
      expect(result.data.origin).toBe("https://example.com");
    });

    it("decodes base64url-encoded webauthn.get clientDataJSON", () => {
      const encoded = encodeJson({
        type: "webauthn.get",
        challenge: "abc123",
        origin: "https://example.com",
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.type).toBe("webauthn.get");
    });

    it("preserves crossOrigin field when present", () => {
      const encoded = encodeJson({
        type: "webauthn.create",
        challenge: "dGVzdA",
        origin: "https://example.com",
        crossOrigin: true,
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.crossOrigin).toBe(true);
    });

    it("puts non-standard fields into extraFields", () => {
      const encoded = encodeJson({
        type: "webauthn.create",
        challenge: "dGVzdA",
        origin: "https://example.com",
        tokenBinding: { status: "present", id: "someId" },
        customField: 42,
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.extraFields).toHaveProperty("tokenBinding");
      expect(result.data.extraFields).toHaveProperty("customField", 42);
      expect(result.data.extraFields).not.toHaveProperty("type");
      expect(result.data.extraFields).not.toHaveProperty("challenge");
      expect(result.data.extraFields).not.toHaveProperty("origin");
    });

    it("result.rawJSON contains the original JSON string", () => {
      const obj = {
        type: "webauthn.create",
        challenge: "dGVzdA",
        origin: "https://example.com",
      };
      const encoded = encodeJson(obj);
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.rawJSON).toBe(JSON.stringify(obj));
    });
  });

  describe("raw JSON string input", () => {
    it("decodes raw JSON string clientDataJSON directly", () => {
      const rawJson = '{"type":"webauthn.get","challenge":"abc","origin":"https://example.com"}';
      const result = decodeClientDataJSON(rawJson);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.type).toBe("webauthn.get");
      expect(result.data.challenge).toBe("abc");
      expect(result.data.origin).toBe("https://example.com");
    });

    it("raw JSON preserves extraFields", () => {
      const rawJson = '{"type":"webauthn.create","challenge":"x","origin":"https://example.com","tokenBinding":{"status":"present"}}';
      const result = decodeClientDataJSON(rawJson);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.extraFields).toHaveProperty("tokenBinding");
    });

    it("raw JSON rawJSON field contains original JSON string", () => {
      const rawJson = '{"type":"webauthn.create","challenge":"x","origin":"https://example.com"}';
      const result = decodeClientDataJSON(rawJson);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.rawJSON).toBe(rawJson);
    });
  });

  describe("ArrayBuffer and Uint8Array input", () => {
    it("decodes ArrayBuffer containing UTF-8 encoded JSON", () => {
      const jsonStr = '{"type":"webauthn.create","challenge":"test","origin":"https://example.com"}';
      const buf = new TextEncoder().encode(jsonStr).buffer as ArrayBuffer;
      const result = decodeClientDataJSON(buf);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.type).toBe("webauthn.create");
    });

    it("decodes Uint8Array containing UTF-8 encoded JSON", () => {
      const jsonStr = '{"type":"webauthn.get","challenge":"test","origin":"https://example.com"}';
      const bytes = new TextEncoder().encode(jsonStr);
      const result = decodeClientDataJSON(bytes);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.type).toBe("webauthn.get");
    });
  });

  describe("challenge handling", () => {
    it("returns empty string for challenge when challenge field is absent", () => {
      const encoded = encodeJson({
        type: "webauthn.create",
        origin: "https://example.com",
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(result.data.challenge).toBe("");
    });
  });

  describe("error cases", () => {
    it("returns error for empty string input", () => {
      const result = decodeClientDataJSON("");
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected error");
      expect(result.error).toBeTruthy();
    });

    it("returns error for invalid base64url that is also not valid JSON", () => {
      const result = decodeClientDataJSON("!!!invalid!!!");
      expect(result.ok).toBe(false);
    });

    it("returns error for valid base64url that decodes to non-JSON", () => {
      // Encode some random bytes that won't parse as JSON
      const notJson = base64.fromArrayBuffer(new Uint8Array([0xFF, 0xFE, 0xAB]).buffer as ArrayBuffer, true);
      const result = decodeClientDataJSON(notJson);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected error");
      expect(result.error).toMatch(/JSON/i);
    });

    it("returns error with suggestion when type field is missing", () => {
      const encoded = encodeJson({
        challenge: "dGVzdA",
        origin: "https://example.com",
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected error");
      expect(result.error).toContain("Missing 'type' field");
      expect(result.suggestion).toBeTruthy();
    });

    it("returns error with suggestion when origin field is missing", () => {
      const encoded = encodeJson({
        type: "webauthn.create",
        challenge: "dGVzdA",
      });
      const result = decodeClientDataJSON(encoded);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected error");
      expect(result.error).toContain("Missing 'origin' field");
      expect(result.suggestion).toBeTruthy();
    });
  });
});
