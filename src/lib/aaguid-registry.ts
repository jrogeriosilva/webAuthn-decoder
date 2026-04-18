/**
 * AAGUID registry lookup module.
 *
 * Data source: passkeydeveloper/passkey-authenticator-aaguids
 * https://github.com/passkeydeveloper/passkey-authenticator-aaguids
 * Bundled: 2026-04-16 (names only, icon_dark/icon_light stripped)
 *
 * The registry maps AAGUID UUIDs to authenticator model names.
 * No runtime network calls — data is bundled at build time per D-07.
 */

import aaguidData from "@/data/aaguid-registry.json";

const registry = aaguidData as Record<string, { name: string }>;

/** Convert 16 raw bytes to lowercase hyphenated UUID string (8-4-4-4-12). */
export function bytesToUuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error("AAGUID must be exactly 16 bytes");
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** Resolve AAGUID bytes to authenticator model name. Returns null if unknown. */
export function resolveAaguid(bytes: Uint8Array): string | null {
  const uuid = bytesToUuid(bytes);
  return registry[uuid]?.name ?? null;
}
