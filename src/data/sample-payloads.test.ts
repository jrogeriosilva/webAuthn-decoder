/**
 * End-to-end tests for built-in sample payloads.
 *
 * Each sample must round-trip through the same pipeline used at runtime:
 *   raw text → format-detection → autoDetectAndDecode / publickeycredential-input
 *
 * The most valuable contract here is "every sample decodes ok=true with a
 * sensible detected type" — that catches drift between the sample generator
 * and the decoder pipeline.
 */
import { describe, it, expect } from "vitest";
import { getSamplePayloads } from "./sample-payloads";
import { detectAndNormalize } from "@/lib/format-detection";
import { autoDetectAndDecode } from "@/lib/payload-type-detection";
import { tryExtractPublicKeyCredential } from "@/lib/publickeycredential-input";
import { decodeFullCredential } from "@/lib/decode-orchestrator";

describe("getSamplePayloads", () => {
  it("returns a non-empty list of samples", () => {
    const samples = getSamplePayloads();
    expect(samples.length).toBeGreaterThan(0);
  });

  it("all sample ids are unique", () => {
    const ids = getSamplePayloads().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns the same cached array across calls", () => {
    expect(getSamplePayloads()).toBe(getSamplePayloads());
  });

  it("each sample has a non-empty label, description and raw payload", () => {
    for (const s of getSamplePayloads()) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.raw.length).toBeGreaterThan(0);
    }
  });
});

describe("sample payload round-trip", () => {
  it.each(getSamplePayloads())(
    "$id: format detection produces expected format",
    (sample) => {
      const fmt = detectAndNormalize(sample.raw);
      expect(fmt.ok).toBe(true);
      if (!fmt.ok) return;
      expect(fmt.format).toBe(sample.format);
    }
  );

  it.each(
    getSamplePayloads().filter((s) => s.id !== "publickeycredential-json")
  )("$id: decodes to ok=true via autoDetectAndDecode", (sample) => {
    const fmt = detectAndNormalize(sample.raw);
    expect(fmt.ok).toBe(true);
    if (!fmt.ok) return;
    const { result } = autoDetectAndDecode(fmt.bytes);
    expect(result.ok).toBe(true);
  });

  it("registration-packed: detected as registration with fmt='packed'", () => {
    const sample = getSamplePayloads().find((s) => s.id === "registration-packed");
    expect(sample).toBeDefined();
    const fmt = detectAndNormalize(sample!.raw);
    if (!fmt.ok) throw new Error("format detect failed");
    const { detectedType, result } = autoDetectAndDecode(fmt.bytes);
    expect(detectedType).toBe("registration");
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== "attestationObject") return;
    expect(result.data.fmt).toBe("packed");
    expect(result.data.authData.attestedCredentialData?.coseKey.alg.name).toBe("ES256");
  });

  it("registration-none: detected as registration with fmt='none'", () => {
    const sample = getSamplePayloads().find((s) => s.id === "registration-none");
    const fmt = detectAndNormalize(sample!.raw);
    if (!fmt.ok) throw new Error("format detect failed");
    const { result } = autoDetectAndDecode(fmt.bytes);
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== "attestationObject") return;
    expect(result.data.fmt).toBe("none");
  });

  it("assertion: detected as authentication with valid clientDataJSON", () => {
    const sample = getSamplePayloads().find((s) => s.id === "assertion");
    const fmt = detectAndNormalize(sample!.raw);
    if (!fmt.ok) throw new Error("format detect failed");
    const { detectedType, result } = autoDetectAndDecode(fmt.bytes);
    expect(detectedType).toBe("authentication");
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== "assertion") return;
    expect(result.data.clientDataJSON.type).toBe("webauthn.get");
    expect(result.data.clientDataJSON.origin).toBe("https://example.com");
  });

  it("clientdata-create: detected as clientDataJSON with type webauthn.create", () => {
    const sample = getSamplePayloads().find((s) => s.id === "clientdata-create");
    const fmt = detectAndNormalize(sample!.raw);
    if (!fmt.ok) throw new Error("format detect failed");
    const { detectedType, result } = autoDetectAndDecode(fmt.bytes);
    expect(detectedType).toBe("clientDataJSON");
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== "clientDataJSON") return;
    expect(result.data.type).toBe("webauthn.create");
  });

  it("publickeycredential-json: extracts envelope and decodes attestationObject", () => {
    const sample = getSamplePayloads().find((s) => s.id === "publickeycredential-json");
    const envelope = tryExtractPublicKeyCredential(sample!.raw);
    expect(envelope).not.toBeNull();
    if (!envelope) return;
    const result = decodeFullCredential(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== "publicKeyCredential") return;
    expect(result.data.response.attestationObject?.fmt).toBe("packed");
  });

  it("registration-packed-hex: detected as hex format", () => {
    const sample = getSamplePayloads().find((s) => s.id === "registration-packed-hex");
    const fmt = detectAndNormalize(sample!.raw);
    expect(fmt.ok).toBe(true);
    if (!fmt.ok) return;
    expect(fmt.format).toBe("hex");
    const { detectedType, result } = autoDetectAndDecode(fmt.bytes);
    expect(detectedType).toBe("registration");
    expect(result.ok).toBe(true);
  });
});
