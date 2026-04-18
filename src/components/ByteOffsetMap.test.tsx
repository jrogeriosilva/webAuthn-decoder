import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ByteOffsetMap } from "./ByteOffsetMap";
import type { DecodedAuthData, AuthDataFlags, CoseKeyInfo } from "@/lib/types";

function makeFlags(overrides: Partial<AuthDataFlags> = {}): AuthDataFlags {
  return { up: true, uv: false, at: false, ed: false, rawByte: 0x01, ...overrides };
}

function makeCoseKey(): CoseKeyInfo {
  return {
    kty: { raw: 2, name: "EC2" },
    alg: { raw: -7, name: "ES256" },
    crv: { raw: 1, name: "P-256" },
    rawEntries: {},
  };
}

function makeMinimalAuthData(): DecodedAuthData {
  return {
    rpIdHash: new Uint8Array(32),
    flags: makeFlags(),
    signCount: 0,
  };
}

function makeFullAuthData(credentialIdLength: number): DecodedAuthData {
  return {
    rpIdHash: new Uint8Array(32),
    flags: makeFlags({ at: true, rawByte: 0x41 }),
    signCount: 0,
    attestedCredentialData: {
      aaguid: new Uint8Array(16),
      credentialId: new Uint8Array(credentialIdLength),
      credentialIdLength,
      coseKey: makeCoseKey(),
    },
  };
}

describe("ByteOffsetMap", () => {
  it("renders 3 segments for minimal authData (no attestedCredentialData)", () => {
    const authData = makeMinimalAuthData();
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={37} />);
    const segments = screen.getAllByTestId("byte-segment");
    expect(segments.length).toBe(3);

    // Should contain rpIdHash, flags, signCount
    const text = segments.map((s) => s.textContent).join(" ");
    expect(text).toContain("rpIdHash");
    expect(text).toContain("flags");
    expect(text).toContain("signCount");

    // Should NOT contain AAGUID or credentialId or COSE key
    expect(text).not.toContain("AAGUID");
    expect(text).not.toContain("credentialId");
    expect(text).not.toContain("COSE key");
  });

  it("renders 7 segments for full authData with attestedCredentialData (credIdLen=32)", () => {
    const authData = makeFullAuthData(32);
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={150} />);
    const segments = screen.getAllByTestId("byte-segment");
    expect(segments.length).toBe(7);

    const text = segments.map((s) => s.textContent).join(" ");
    expect(text).toContain("rpIdHash");
    expect(text).toContain("flags");
    expect(text).toContain("signCount");
    expect(text).toContain("AAGUID");
    expect(text).toContain("credIdLen");
    expect(text).toContain("credentialId");
    expect(text).toContain("COSE key");
  });

  it("renders the heading 'authenticatorData byte layout'", () => {
    const authData = makeMinimalAuthData();
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={37} />);
    expect(screen.getByText("authenticatorData byte layout")).toBeTruthy();
  });

  it("each segment includes field name and byte range", () => {
    const authData = makeMinimalAuthData();
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={37} />);
    const segments = screen.getAllByTestId("byte-segment");

    // rpIdHash: 0-31
    expect(segments[0].textContent).toContain("rpIdHash");
    expect(segments[0].textContent).toContain("0-31");

    // flags: 32
    expect(segments[1].textContent).toContain("flags");
    expect(segments[1].textContent).toContain("32");

    // signCount: 33-36
    expect(segments[2].textContent).toContain("signCount");
    expect(segments[2].textContent).toContain("33-36");
  });

  it("full authData segments include correct byte ranges", () => {
    const authData = makeFullAuthData(32);
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={150} />);
    const segments = screen.getAllByTestId("byte-segment");

    // AAGUID: 37-52
    expect(segments[3].textContent).toContain("AAGUID");
    expect(segments[3].textContent).toContain("37-52");

    // credIdLen: 53-54
    expect(segments[4].textContent).toContain("credIdLen");
    expect(segments[4].textContent).toContain("53-54");

    // credentialId: 55-86 (55 + 32 - 1 = 86)
    expect(segments[5].textContent).toContain("credentialId");
    expect(segments[5].textContent).toContain("55-86");

    // COSE key: 87-149
    expect(segments[6].textContent).toContain("COSE key");
    expect(segments[6].textContent).toContain("87-149");
  });

  it("skips credentialId segment when credentialIdLength is 0", () => {
    const authData = makeFullAuthData(0);
    render(<ByteOffsetMap authData={authData} rawAuthDataLength={120} />);
    const segments = screen.getAllByTestId("byte-segment");
    const text = segments.map((s) => s.textContent).join(" ");
    // Should have AAGUID, credIdLen, COSE key but NOT credentialId
    expect(text).toContain("AAGUID");
    expect(text).toContain("credIdLen");
    expect(text).not.toContain("credentialId");
    expect(text).toContain("COSE key");
  });

  it("does not throw when rawAuthDataLength < 55 + credentialIdLength (defensive)", () => {
    const authData = makeFullAuthData(32);
    // rawAuthDataLength is too short for COSE key
    expect(() =>
      render(<ByteOffsetMap authData={authData} rawAuthDataLength={60} />)
    ).not.toThrow();
    const segments = screen.getAllByTestId("byte-segment");
    const text = segments.map((s) => s.textContent).join(" ");
    // Should render available segments, omit COSE key
    expect(text).toContain("rpIdHash");
    expect(text).toContain("AAGUID");
    expect(text).not.toContain("COSE key");
  });
});
