/**
 * Built-in sample FIDO2 / WebAuthn payloads for the "Load sample" menu.
 *
 * Each sample is generated at module load time from synthetic but
 * structurally-valid bytes (cbor-x encode + base64url) so it always
 * decodes cleanly through the same pipeline used for user input.
 *
 * No real production credentials — all bytes are deterministic
 * patterns chosen for readability in the tree view.
 */

import { encode } from "cbor-x";
import { base64 } from "@hexagon/base64";

/** A sample payload entry shown in the picker menu. */
export interface SamplePayload {
  /** Stable id for tests / keys. */
  id: string;
  /** Short label shown in the menu. */
  label: string;
  /** One-line description of what the sample demonstrates. */
  description: string;
  /** Format the user will see in the textarea once loaded. */
  format: "base64url" | "json" | "hex";
  /** The literal text that will be placed in the textarea. */
  raw: string;
}

// ---------- low-level helpers ----------

function fillBytes(length: number, fill: number): Uint8Array {
  return new Uint8Array(length).fill(fill);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return base64.fromArrayBuffer(buf, true);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function utf8ToBase64Url(s: string): string {
  return bytesToBase64Url(new TextEncoder().encode(s));
}

// ---------- COSE / authData builders ----------

/** Minimal EC2 P-256 COSE key (kty=2, alg=ES256, crv=P-256). */
function buildCoseEC2P256(): Uint8Array {
  return encode(
    new Map<number, number | Uint8Array>([
      [1, 2],                          // kty: EC2
      [3, -7],                         // alg: ES256
      [-1, 1],                         // crv: P-256
      [-2, fillBytes(32, 0x11)],       // x
      [-3, fillBytes(32, 0x22)],       // y
    ])
  );
}

interface AuthDataOptions {
  rpIdHashFill?: number;
  up?: boolean;
  uv?: boolean;
  signCount?: number;
  /** Include attestedCredentialData (sets AT flag). */
  attested?: boolean;
  aaguidFill?: number;
  credentialIdFill?: number;
  credentialIdLength?: number;
}

/** Build a full authenticatorData binary struct. */
function buildAuthData(opts: AuthDataOptions = {}): Uint8Array {
  const {
    rpIdHashFill = 0xa1,
    up = true,
    uv = true,
    signCount = 1,
    attested = false,
    aaguidFill = 0xaa,
    credentialIdFill = 0xc1,
    credentialIdLength = 16,
  } = opts;

  let flags = 0;
  if (up) flags |= 0x01;
  if (uv) flags |= 0x04;
  if (attested) flags |= 0x40;

  const head = new Uint8Array(37);
  head.set(fillBytes(32, rpIdHashFill), 0);
  head[32] = flags;
  new DataView(head.buffer).setUint32(33, signCount, false);

  if (!attested) return head;

  const cose = buildCoseEC2P256();
  const aaguid = fillBytes(16, aaguidFill);
  const credId = fillBytes(credentialIdLength, credentialIdFill);

  const acdLen = aaguid.length + 2 + credId.length + cose.length;
  const out = new Uint8Array(head.length + acdLen);
  out.set(head, 0);
  let off = head.length;
  out.set(aaguid, off); off += aaguid.length;
  new DataView(out.buffer).setUint16(off, credId.length, false); off += 2;
  out.set(credId, off); off += credId.length;
  out.set(cose, off);
  return out;
}

// ---------- attestationObject (registration) ----------

function buildAttestationObjectPacked(): Uint8Array {
  const authData = buildAuthData({ attested: true, signCount: 0 });
  return encode({
    fmt: "packed",
    attStmt: {
      alg: -7,
      sig: fillBytes(64, 0x33),
      x5c: [fillBytes(96, 0x44)],
    },
    authData,
  });
}

function buildAttestationObjectNone(): Uint8Array {
  const authData = buildAuthData({ attested: true, signCount: 0 });
  return encode({
    fmt: "none",
    attStmt: {},
    authData,
  });
}

// ---------- assertion (authentication) ----------

function buildAssertionCbor(): Uint8Array {
  const authData = buildAuthData({ attested: false, signCount: 42 });
  const clientDataJSON = JSON.stringify({
    type: "webauthn.get",
    challenge: utf8ToBase64Url("sample-get-challenge"),
    origin: "https://example.com",
    crossOrigin: false,
  });
  return encode({
    authenticatorData: authData,
    signature: fillBytes(70, 0x55),
    clientDataJSON: utf8ToBase64Url(clientDataJSON),
    userHandle: fillBytes(16, 0x66),
  });
}

// ---------- clientDataJSON ----------

function buildClientDataJsonCreate(): string {
  return JSON.stringify({
    type: "webauthn.create",
    challenge: utf8ToBase64Url("sample-create-challenge"),
    origin: "https://example.com",
    crossOrigin: false,
  });
}

// ---------- PublicKeyCredential JSON envelope ----------

function buildPublicKeyCredentialRegistrationJSON(): string {
  const attestationObject = buildAttestationObjectPacked();
  const clientDataJSON = buildClientDataJsonCreate();
  const credentialId = fillBytes(16, 0xc1);

  return JSON.stringify(
    {
      id: bytesToBase64Url(credentialId),
      rawId: bytesToBase64Url(credentialId),
      type: "public-key",
      authenticatorAttachment: "platform",
      response: {
        attestationObject: bytesToBase64Url(attestationObject),
        clientDataJSON: utf8ToBase64Url(clientDataJSON),
        transports: ["internal", "hybrid"],
        publicKeyAlgorithm: -7,
        publicKey: bytesToBase64Url(buildCoseEC2P256()),
      },
      clientExtensionResults: { credProps: { rk: true } },
    },
    null,
    2
  );
}

// ---------- public sample list (lazy, cached) ----------

let cached: SamplePayload[] | null = null;

export function getSamplePayloads(): SamplePayload[] {
  if (cached) return cached;

  cached = [
    {
      id: "registration-packed",
      label: "Registration · packed (ES256)",
      description: "attestationObject with packed attestation, EC2 P-256 COSE key, AAGUID, and a sample x5c.",
      format: "base64url",
      raw: bytesToBase64Url(buildAttestationObjectPacked()),
    },
    {
      id: "registration-none",
      label: "Registration · none",
      description: "Minimal attestationObject with fmt='none' and an EC2 P-256 credential.",
      format: "base64url",
      raw: bytesToBase64Url(buildAttestationObjectNone()),
    },
    {
      id: "assertion",
      label: "Authentication · assertion",
      description: "Assertion CBOR with authenticatorData, signature, clientDataJSON, and userHandle.",
      format: "base64url",
      raw: bytesToBase64Url(buildAssertionCbor()),
    },
    {
      id: "clientdata-create",
      label: "clientDataJSON · webauthn.create",
      description: "Base64url-encoded clientDataJSON for a registration ceremony.",
      format: "base64url",
      raw: utf8ToBase64Url(buildClientDataJsonCreate()),
    },
    {
      id: "publickeycredential-json",
      label: "PublicKeyCredential JSON · registration",
      description: "Full PublicKeyCredential JSON envelope as returned by navigator.credentials.create().",
      format: "json",
      raw: buildPublicKeyCredentialRegistrationJSON(),
    },
    {
      id: "registration-packed-hex",
      label: "Registration · packed (hex)",
      description: "Same packed attestationObject as above, but encoded as a hex string.",
      format: "hex",
      raw: bytesToHex(buildAttestationObjectPacked()),
    },
  ];

  return cached;
}
