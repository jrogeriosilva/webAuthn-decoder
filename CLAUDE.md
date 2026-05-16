# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WebAuthn Decoder** — browser-only developer tool for decoding FIDO2/WebAuthn protocol data. Users paste encoded payloads (base64url, hex, raw CBOR, or full `PublicKeyCredential` JSON) and get an interactive tree view.

**Hard constraints:**
- Browser-only. No server, no network calls with payload data — users paste production credentials.
- All decoding runs in-browser (JS/TS, CBOR via `cbor-x`).

## Commands

```
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build (type-check is part of build)
npm run lint       # ESLint (flat config, eslint.config.js)
npm run preview    # Serve the production build
npx vitest         # Run all tests (jsdom env, globals enabled)
npx vitest run src/lib/decode-authdata.test.ts   # Single file
npx vitest -t "decodes COSE key"                 # By test name
```

No `test` script is defined in package.json — invoke `vitest` directly. Setup file: `src/test-setup.ts`.

Path alias: `@/*` → `src/*` (configured in both `vite.config.ts` and `vitest.config.ts`; keep them in sync).

## Architecture

Data flows one direction: **raw text input → format detection → decode orchestrator → tree preprocess → render**.

### Entry point and state (`src/App.tsx`)

`App` owns the top-level state and wires input to output in a single `useEffect`:
1. First tries `tryExtractPublicKeyCredential(rawInput)` — if the user pasted a full `PublicKeyCredential` JSON envelope, this extracts the inner `attestationObject` or `authenticatorData` bytes and infers the payload type. The inferred type overrides the user's radio selection (`inferredPayloadType` wins).
2. Otherwise falls back to `formatResult.bytes` (produced by `PayloadInput` via `format-detection`) combined with the user-selected `payloadType`.
3. Calls `decodePayload(type, bytes)` → stores `DecodeResult` for `OutputArea`.

### The decode pipeline (`src/lib/`)

- `decode-orchestrator.ts` — single entry point (`decodePayload`). Routes `PayloadType` to the right decoder. **Never throws** — malformed input returns `{ ok: false, error, suggestion? }`. All four branches (`registration` / `authentication` / `clientDataJSON` / `raw-cbor`) must remain exhaustive (relies on TS `never` check).
- `decode-attestation.ts` — top-level CBOR attestationObject (`fmt`, `authData`, `attStmt`). Extracts `authData` bytes then hands off.
- `decode-authdata.ts` — **manual binary parsing** of the authenticatorData struct (rpIdHash 32B, flags 1B, signCount 4B BE, optional attestedCredentialData, optional extensions). This is not CBOR — do not try to `cbor-x.decode` it. The COSE key *inside* attestedCredentialData *is* CBOR.
- `decode-assertion.ts` — assertion response (authenticatorData + signature + clientDataJSON + optional userHandle).
- `decode-clientdata.ts` — base64url/UTF-8 JSON.
- `cose-map.ts` — maps COSE integer labels (kty/alg/crv) to human names. Used by decode-authdata to produce `CoseKeyInfo`.
- `aaguid-registry.ts` + `src/data/aaguid-registry.json` — AAGUID → authenticator name lookup.
- `format-detection.ts` — classifies raw user text as base64url / hex / raw-bytes / PublicKeyCredential JSON and returns `{ ok, bytes, format }`.
- `publickeycredential-input.ts` — envelope extractor for pasted WebAuthn JSON; returns `{ rawId, innerBytes, innerKind }`.
- `tree-preprocess.ts` — transforms `DecodeResult.data` into a plain object for `DecodeTreeView`. This is where `Uint8Array` fields get rendered as hex strings, etc.
- `types.ts` — the canonical types (`DecodeResult`, `DecodedAttestationObject`, `DecodedAuthData`, `CoseKeyInfo`, etc.). Touch this when changing decoder output shape — both producers and consumers depend on it.

### UI layer (`src/components/`)

`App` composes `AppHeader` + `PayloadInput` + `OutputArea`. `OutputArea` renders `DecodeTreeView` (via `react-json-view-lite`) and `FormatBadge`. shadcn primitives live in `components/ui/` (`button`, `badge`, `textarea`) — style is `base-nova`, neutral base color, CSS variables on, icon library `lucide`.

### Result-type contract

Every decoder returns a discriminated union `{ ok: true, type, data } | { ok: false, error, suggestion? }`. Never throw from a decoder — catch and wrap. The UI branches on `ok`; a thrown exception will blank the output area and break the debounced re-decode cycle.

## Stack decisions (binding)

These are locked in and should not be swapped without discussion:

- **CBOR:** `cbor-x` — import from `cbor-x/decode` (decode-only, smaller bundle). Do **not** add `cbor-web` (deprecated), `cbor2`, or `fido2-lib` (Node-only).
- **base64url ↔ bytes:** `@hexagon/base64` with `toArrayBuffer(input, true)` (URL-safe mode). Do not hand-roll `atob`/`btoa` replacements across the codebase.
- **Hex:** local helpers in `src/lib/hex-utils.ts`. No dependency.
- **Tree view:** `react-json-view-lite`. Do not swap for `react-json-view` (unmaintained) without reason.
- **Styling:** Tailwind v4 via `@tailwindcss/vite`. CSS-based config in `src/index.css` (`@theme` directive). There is no `tailwind.config.*` file — don't add one.
- **Components:** shadcn/ui on top of `@base-ui/react`. Config in `components.json`.

## Conventions observed in the code

- Co-located tests: `foo.ts` + `foo.test.ts` in the same directory.
- `DecodeResult` is the universal return shape; use `type` as the discriminator in consumers.
- Represent raw byte fields as `Uint8Array` in decoder output; convert to hex strings at the `tree-preprocess` boundary, not inside decoders.
- COSE key: preserve `rawEntries` alongside mapped `kty`/`alg`/`crv` so the UI can show both.
- Exhaustiveness: when switching on `PayloadType` or `DecodeResult.type`, include a `never` default to catch missed variants at compile time (see `decode-orchestrator.ts`).
