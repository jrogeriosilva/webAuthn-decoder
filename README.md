# WebAuthn Decoder

A browser-only developer tool for decoding FIDO2 / WebAuthn protocol data. Paste an encoded payload — base64url, hex, raw CBOR, or a full `PublicKeyCredential` JSON envelope — and inspect the decoded structure in an interactive tree view.

## Privacy

Everything runs in the browser. No payload data is ever sent over the network, so it's safe to paste production credentials.

## Features

- Decodes WebAuthn **registration** responses (CBOR `attestationObject` + `authData` + `attStmt`)
- Decodes **authentication** assertions (`authenticatorData` + signature + `clientDataJSON` + optional `userHandle`)
- Decodes `clientDataJSON` on its own
- Decodes arbitrary **raw CBOR**
- Auto-detects input format (base64url / hex / raw bytes / pasted `PublicKeyCredential` JSON)
- Maps COSE key labels (kty / alg / crv) to human-readable names
- Looks up authenticator model names from the AAGUID registry
- Copy any subtree or the full decoded output

## Getting started

```bash
npm install
npm run dev        # start the Vite dev server
npm run build      # type-check + production build
npm run preview    # serve the production build
npm run lint       # ESLint
npx vitest         # run the test suite
```

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (CSS-based config via `@theme`) with **shadcn/ui** on top of `@base-ui/react`
- **cbor-x** for CBOR decoding
- **@hexagon/base64** for base64url ↔ bytes
- **react-json-view-lite** for the tree view
- **Vitest** + **Testing Library** (jsdom) for tests

## Architecture

Data flows in one direction:

```
raw text input → format detection → decode orchestrator → tree preprocess → render
```

Key modules live in [src/lib/](src/lib/):

- [decode-orchestrator.ts](src/lib/decode-orchestrator.ts) — single entry point; routes by `PayloadType`
- [decode-attestation.ts](src/lib/decode-attestation.ts) — top-level attestationObject CBOR
- [decode-authdata.ts](src/lib/decode-authdata.ts) — manual binary parsing of the authenticatorData struct
- [decode-assertion.ts](src/lib/decode-assertion.ts) — assertion response decoding
- [decode-clientdata.ts](src/lib/decode-clientdata.ts) — base64url + UTF-8 JSON
- [format-detection.ts](src/lib/format-detection.ts) — classifies raw user input
- [publickeycredential-input.ts](src/lib/publickeycredential-input.ts) — extracts bytes from pasted `PublicKeyCredential` JSON
- [cose-map.ts](src/lib/cose-map.ts) + [aaguid-registry.ts](src/lib/aaguid-registry.ts) — label lookups
- [tree-preprocess.ts](src/lib/tree-preprocess.ts) — converts decoder output into a tree-renderable object
- [types.ts](src/lib/types.ts) — canonical types (`DecodeResult`, `DecodedAuthData`, `CoseKeyInfo`, …)

Every decoder returns a discriminated union:

```ts
{ ok: true, type, data } | { ok: false, error, suggestion? }
```

Decoders never throw — malformed input surfaces as a structured error.

## Project layout

```
src/
  App.tsx              # top-level state; wires input → decode → output
  components/          # UI components (AppHeader, PayloadInput, OutputArea, DecodeTreeView, …)
    ui/                # shadcn primitives
  lib/                 # decoders + utilities (see above)
  data/                # aaguid-registry.json
  test-setup.ts
```

Path alias: `@/*` → `src/*` (configured in both `vite.config.ts` and `vitest.config.ts`).

## License

Not yet specified.
