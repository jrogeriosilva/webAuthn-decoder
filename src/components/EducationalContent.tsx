import { useEffect, useState } from "react"
import lifecycleImg from "@/assets/fido2-webauthn-diagrams-dark/01-webauthn-credential-lifecycle-dark.svg"
import anatomyImg from "@/assets/fido2-webauthn-diagrams-dark/02-publickeycredential-anatomy-dark.svg"
import authdataImg from "@/assets/fido2-webauthn-diagrams-dark/03-authenticatordata-byte-layout-dark.svg"
import attestationImg from "@/assets/fido2-webauthn-diagrams-dark/04-attestationobject-structure-dark.svg"

type LightboxState = { src: string; alt: string } | null

function DiagramImage({ src, alt }: { src: string; alt: string }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  return (
    <>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg cursor-zoom-in transition-opacity hover:opacity-90"
        onClick={() => setLightbox({ src, alt })}
      />
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export function EducationalContent() {
  return (
    <article
      aria-labelledby="learn-heading"
      className="mt-16 border-t border-border pt-12 pb-16 space-y-10 text-sm leading-relaxed"
    >
      <header className="space-y-3">
        <h2 id="learn-heading" className="text-2xl font-semibold">
          Understanding FIDO2 and WebAuthn Payloads
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          WebAuthn Decoder is a free, browser-based tool for decoding and inspecting WebAuthn protocol
          data. Whether you are integrating passkeys into a web application, debugging a failed
          registration, or auditing an authenticator's attestation statement, this tool decodes
          every layer — from the outer CBOR envelope down to the raw COSE key — without sending
          any data to a server. Everything runs locally in your browser.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What Is FIDO2?</h2>
        <p className="text-muted-foreground">
          FIDO2 is the umbrella name for two complementary standards published by the FIDO Alliance
          and the World Wide Web Consortium (W3C): the <strong className="text-foreground">Web Authentication API (WebAuthn)</strong> and
          the <strong className="text-foreground">Client to Authenticator Protocol 2 (CTAP2)</strong>. Together they enable
          phishing-resistant, passwordless authentication — sometimes called passkeys — across
          browsers, operating systems, and hardware security keys.
        </p>
        <p className="text-muted-foreground">
          WebAuthn defines the JavaScript API that relying parties (websites) call, and the
          cryptographic data structures their servers must verify. CTAP2 defines how the browser
          communicates with an external authenticator such as a YubiKey, a phone, or a platform
          authenticator built into a laptop's TPM. WebAuthn Decoder focuses on the WebAuthn data
          structures that flow between the browser and the relying party server.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">The WebAuthn Credential Lifecycle</h2>
        <DiagramImage
          src={lifecycleImg}
          alt="Diagram showing the WebAuthn credential lifecycle: registration with navigator.credentials.create and authentication with navigator.credentials.get"
        />
        <p className="text-muted-foreground">
          WebAuthn has two distinct ceremony types, each producing a different payload shape:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">Registration</strong> — the browser calls{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">navigator.credentials.create()</code> with
            a challenge from the server. The authenticator generates a new asymmetric key pair, signs
            the challenge, and returns a{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">PublicKeyCredential</code> whose{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">response</code> includes an{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">attestationObject</code> and a{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">clientDataJSON</code>. The server
            stores the public key for future authentications.
          </li>
          <li>
            <strong className="text-foreground">Authentication</strong> — the browser calls{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">navigator.credentials.get()</code> with
            a new server challenge. The authenticator signs the challenge with the private key it
            stored during registration and returns a{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">PublicKeyCredential</code> whose{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">response</code> includes an{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">authenticatorData</code>, a{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">signature</code>, and a{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">clientDataJSON</code>.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anatomy of a PublicKeyCredential</h2>
        <DiagramImage
          src={anatomyImg}
          alt="Diagram showing the structure of a PublicKeyCredential object with fields: id, rawId, response.attestationObject, response.authenticatorData, response.clientDataJSON, response.signature, and response.userHandle"
        />
        <p className="text-muted-foreground">
          The object returned by both WebAuthn ceremonies is a{" "}
          <code className="font-mono text-xs bg-muted px-1 rounded">PublicKeyCredential</code>. Its most
          important fields are:
        </p>
        <dl className="space-y-3 text-muted-foreground">
          {[
            ["id / rawId", "A base64url-encoded (id) or raw ArrayBuffer (rawId) unique identifier for this credential."],
            ["response.attestationObject", "Registration only. A CBOR-encoded map containing fmt (attestation format), authData (authenticator data bytes), and attStmt (attestation statement). This is what you decode here to inspect a new credential."],
            ["response.authenticatorData", "Authentication only (also nested inside attestationObject during registration). Raw binary data — not CBOR — containing the RP ID hash, flags, sign count, and optional attested credential data."],
            ["response.clientDataJSON", "Base64url-encoded UTF-8 JSON bound to both ceremonies. Contains type, challenge, origin, and optionally crossOrigin and tokenBinding."],
            ["response.signature", "Authentication only. The authenticator's signature over authenticatorData ‖ SHA-256(clientDataJSON), using the private key registered earlier."],
            ["response.userHandle", "Authentication only. The opaque user ID set during registration, returned by the authenticator to help the server find the right account."],
          ].map(([term, def]) => (
            <div key={term}>
              <dt className="font-mono text-xs text-foreground font-medium">{term}</dt>
              <dd className="mt-0.5 pl-3">{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Decoding the attestationObject</h2>
        <DiagramImage
          src={attestationImg}
          alt="Diagram showing the CBOR structure of attestationObject with keys: fmt, authData, and attStmt"
        />
        <p className="text-muted-foreground">
          The <code className="font-mono text-xs bg-muted px-1 rounded">attestationObject</code> is a
          CBOR-encoded map with three top-level keys:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><code className="font-mono text-xs bg-muted px-1 rounded">fmt</code> — a string identifying the attestation statement format.</li>
          <li><code className="font-mono text-xs bg-muted px-1 rounded">authData</code> — the raw authenticator data bytes (described in the next section).</li>
          <li><code className="font-mono text-xs bg-muted px-1 rounded">attStmt</code> — a CBOR map whose structure depends on <code className="font-mono text-xs bg-muted px-1 rounded">fmt</code>.</li>
        </ul>
        <p className="text-muted-foreground">
          Common <code className="font-mono text-xs bg-muted px-1 rounded">fmt</code> values and what they mean:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">none</strong> — no attestation. The authenticator does not prove its model. Widely used for platform authenticators (Face ID, Windows Hello, Android biometrics) when the relying party does not need to verify device provenance.</li>
          <li><strong className="text-foreground">packed</strong> — a compact, general-purpose format defined by the WebAuthn spec. Used by most security keys and many platform authenticators.</li>
          <li><strong className="text-foreground">fido-u2f</strong> — legacy FIDO U2F compatibility format. Seen on older YubiKeys and keys manufactured before the FIDO2 standard.</li>
          <li><strong className="text-foreground">tpm</strong> — Trusted Platform Module attestation. Used by Windows Hello for Business when a TPM is present.</li>
          <li><strong className="text-foreground">android-key</strong> — Android Keystore attestation. Used on Android devices with hardware-backed key storage.</li>
          <li><strong className="text-foreground">apple</strong> — Apple Anonymous Attestation. Used by Touch ID, Face ID, and the iPhone Secure Enclave since iOS 14 / macOS 11.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reading authenticatorData</h2>
        <DiagramImage
          src={authdataImg}
          alt="Diagram showing the byte layout of authenticatorData: rpIdHash (32 bytes), flags (1 byte), signCount (4 bytes), attestedCredentialData, and extensions"
        />
        <p className="text-muted-foreground">
          Unlike most other fields in WebAuthn, <code className="font-mono text-xs bg-muted px-1 rounded">authenticatorData</code> is
          not CBOR. It is a manually packed binary structure — you cannot run a CBOR decoder over it
          directly. Its layout is:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">Bytes 0–31</strong> — rpIdHash: the SHA-256 hash of the Relying Party ID (usually the effective domain, e.g. <code className="font-mono text-xs bg-muted px-1 rounded">example.com</code>). The server must verify this matches its own RP ID.</li>
          <li><strong className="text-foreground">Byte 32</strong> — flags: a bitmask encoding user presence (UP, bit 0), user verification (UV, bit 2), backup eligibility (BE, bit 3), backup state (BS, bit 4), attested credential data included (AT, bit 6), and extension data included (ED, bit 7).</li>
          <li><strong className="text-foreground">Bytes 33–36</strong> — signCount: a 32-bit big-endian unsigned integer incremented by the authenticator on every authentication. A count lower than the server's stored value indicates a possible cloned authenticator.</li>
          <li><strong className="text-foreground">Bytes 37+</strong> — attestedCredentialData (only if AT flag set): a variable-length structure containing the AAGUID (16 bytes), credential ID length (2 bytes BE), credential ID, and a CBOR-encoded COSE public key.</li>
          <li><strong className="text-foreground">Trailing bytes</strong> — extensions CBOR map (only if ED flag set).</li>
        </ul>
        <p className="text-muted-foreground">
          WebAuthn Decoder parses this structure byte-by-byte, correctly separating the binary sections
          from the embedded CBOR so each field is labeled and highlighted individually in the tree.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">COSE Keys Explained</h2>
        <p className="text-muted-foreground">
          WebAuthn represents public keys in the{" "}
          <strong className="text-foreground">CBOR Object Signing and Encryption (COSE)</strong> format
          defined in RFC 8152. A COSE_Key is a CBOR map where integer labels carry meaning defined
          by the COSE registry. The most important labels are:
        </p>
        <dl className="space-y-3 text-muted-foreground">
          {[
            ["1 (kty)", "Key type. 1 = OKP (EdDSA), 2 = EC2 (elliptic curve), 3 = RSA."],
            ["3 (alg)", "Algorithm. -7 = ES256 (EC2 + P-256 + SHA-256), -8 = EdDSA (OKP + Ed25519), -257 = RS256 (RSA + PKCS1v1.5 + SHA-256)."],
            ["-1 (crv / n)", "For EC2: curve ID. 1 = P-256, 2 = P-384, 3 = P-521. For OKP: 6 = Ed25519. For RSA: the modulus n."],
            ["-2 (x / e)", "For EC2 / OKP: the x-coordinate of the public key point. For RSA: the public exponent e."],
            ["-3 (y)", "For EC2 only: the y-coordinate (not present in OKP or RSA keys)."],
          ].map(([label, desc]) => (
            <div key={label}>
              <dt className="font-mono text-xs text-foreground font-medium">{label}</dt>
              <dd className="mt-0.5 pl-3">{desc}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground">
          COSE's integer labels make serialized keys compact — roughly 30% smaller than an
          equivalent JWK — which matters inside the packed binary format of authenticatorData.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What's Inside clientDataJSON</h2>
        <p className="text-muted-foreground">
          <code className="font-mono text-xs bg-muted px-1 rounded">clientDataJSON</code> is not CBOR — it is
          UTF-8 JSON, base64url-encoded. The browser creates it and the authenticator signs it
          indirectly (as SHA-256(clientDataJSON)). Key fields:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">type</strong> — either <code className="font-mono text-xs bg-muted px-1 rounded">"webauthn.create"</code> (registration) or <code className="font-mono text-xs bg-muted px-1 rounded">"webauthn.get"</code> (authentication). The server must verify this to prevent cross-ceremony replay attacks.</li>
          <li><strong className="text-foreground">challenge</strong> — the base64url-encoded random challenge issued by the server. Must be verified byte-for-byte.</li>
          <li><strong className="text-foreground">origin</strong> — the origin (scheme + host + port) of the page that invoked WebAuthn. The server must verify this matches its expected origin.</li>
          <li><strong className="text-foreground">crossOrigin</strong> — boolean, true when the WebAuthn call was made inside a cross-origin iframe. Relying parties that do not embed WebAuthn in iframes should reject true.</li>
          <li><strong className="text-foreground">tokenBinding</strong> — optional; relates to TLS token binding (rarely used in practice).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Common Debugging Scenarios</h2>
        <p className="text-muted-foreground">
          Use WebAuthn Decoder to diagnose these frequent integration problems:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Origin mismatch</strong> — the <code className="font-mono text-xs bg-muted px-1 rounded">origin</code> in <code className="font-mono text-xs bg-muted px-1 rounded">clientDataJSON</code> does not match the server's expected origin. Common cause: testing on <code className="font-mono text-xs bg-muted px-1 rounded">localhost</code> but comparing against a production domain, or a missing port number.</li>
          <li><strong className="text-foreground">RP ID hash mismatch</strong> — the first 32 bytes of <code className="font-mono text-xs bg-muted px-1 rounded">authenticatorData</code> do not match SHA-256(rpId). Often caused by a misconfigured <code className="font-mono text-xs bg-muted px-1 rounded">rp.id</code> in the credential options, or by comparing the wrong domain (e.g. including a subdomain that wasn't intended).</li>
          <li><strong className="text-foreground">signCount regression</strong> — the signCount in the assertion is equal to or less than the value stored from a previous authentication. This is the authenticator's cloning-detection mechanism. Investigate whether multiple devices share a credential or whether the server's stored count is incorrect.</li>
          <li><strong className="text-foreground">Unexpected AAGUID</strong> — the AAGUID in <code className="font-mono text-xs bg-muted px-1 rounded">attestedCredentialData</code> does not match the authenticator you expected. Check the FIDO Metadata Service (MDS) to see what device the AAGUID belongs to.</li>
          <li><strong className="text-foreground">Unsupported attestation format</strong> — the server's attestation verification library does not support the <code className="font-mono text-xs bg-muted px-1 rounded">fmt</code> returned by the authenticator. Either widen the accepted formats or set <code className="font-mono text-xs bg-muted px-1 rounded">attestation: "none"</code> in <code className="font-mono text-xs bg-muted px-1 rounded">PublicKeyCredentialCreationOptions</code> if you do not need attestation verification.</li>
          <li><strong className="text-foreground">UP or UV flag not set</strong> — the authenticator did not assert user presence (UP) or user verification (UV). Verify that the authenticator model supports the required user verification method and that <code className="font-mono text-xs bg-muted px-1 rounded">userVerification</code> is set to <code className="font-mono text-xs bg-muted px-1 rounded">"required"</code> when UV is mandatory for your threat model.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Privacy &amp; Security of This Tool</h2>
        <p className="text-muted-foreground">
          WebAuthn payloads often contain real credential identifiers, user handles, and AAGUID values
          that can identify both the user and their authenticator. WebAuthn Decoder is designed so that
          none of this data ever leaves your browser:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>All decoding (CBOR, base64url, hex, binary parsing) runs in JavaScript inside your browser tab.</li>
          <li>No network requests are made with payload data — you can verify this with browser DevTools → Network.</li>
          <li>No analytics, telemetry, or third-party SDKs receive your credential data.</li>
          <li>There is no server-side component. The tool is a static single-page application.</li>
        </ul>
        <p className="text-muted-foreground">
          You can safely paste production credentials from your WebAuthn integration for debugging
          purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        <dl className="space-y-5">
          {[
            [
              "Is base64url different from standard base64?",
              "Yes. Base64url uses - instead of + and _ instead of / in the alphabet, and omits = padding characters. WebAuthn uses base64url everywhere. Attempting to decode a WebAuthn payload with a standard base64 decoder often fails or produces garbage bytes — make sure to use a URL-safe decoder."
            ],
            [
              "What is an AAGUID?",
              "An Authenticator Attestation GUID (AAGUID) is a 16-byte identifier assigned by the authenticator manufacturer to a specific model. During registration it appears inside attestedCredentialData and lets the relying party look up the authenticator's metadata (manufacturer, supported algorithms, certifications) via the FIDO Metadata Service."
            ],
            [
              "Why is authenticatorData not plain CBOR?",
              "The WebAuthn specification chose a tightly packed binary layout for authenticatorData for performance reasons — the structure is signed directly by the authenticator and must be verifiable without a full CBOR parser on constrained hardware. The COSE key embedded inside it is CBOR, but the surrounding binary frame (rpIdHash, flags, signCount, credentialIdLength, credentialId) is manually packed."
            ],
            [
              "What does the backup eligibility (BE) flag mean?",
              "The BE (Backup Eligibility) flag, introduced with passkeys, indicates that the authenticator is capable of syncing the private key to a cloud account (e.g. iCloud Keychain or Google Password Manager). The companion BS (Backup State) flag indicates whether the key is currently synced. Relying parties can choose to reject credentials where BE is set if they require single-device binding."
            ],
            [
              "What formats can WebAuthn Decoder decode?",
              "WebAuthn Decoder accepts: a full PublicKeyCredential JSON object (paste the JSON directly), a base64url-encoded attestationObject or authenticatorData, a hex-encoded payload, or raw CBOR bytes pasted as base64url. The tool auto-detects the format and selects the right decoder."
            ],
            [
              "Can I use this tool offline?",
              "Yes. Once the page has loaded, all decoding works without an internet connection. You can save the page locally or self-host the static build output."
            ],
            [
              "What is the difference between attestation and assertion?",
              "Attestation is part of registration: the authenticator proves its identity and model to the server by signing with a manufacturer certificate chain. Assertion is part of authentication: the authenticator proves ownership of a previously registered private key by signing the challenge. Most deployments use attestation-none (skipping the proof-of-model step) because the full attestation verification infrastructure is complex."
            ],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold text-foreground">{q}</dt>
              <dd className="mt-1 text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  )
}
