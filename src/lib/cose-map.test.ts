import { describe, it, expect } from "vitest";
import { resolveAlg, resolveKty, resolveCrv, resolveCoseKey } from "./cose-map";

describe("resolveAlg", () => {
  it("resolves -7 to ES256", () => {
    expect(resolveAlg(-7)).toEqual({ raw: -7, name: "ES256" });
  });

  it("resolves -257 to RS256", () => {
    expect(resolveAlg(-257)).toEqual({ raw: -257, name: "RS256" });
  });

  it("resolves -8 to EdDSA", () => {
    expect(resolveAlg(-8)).toEqual({ raw: -8, name: "EdDSA" });
  });

  it("resolves -35 to ES384", () => {
    expect(resolveAlg(-35)).toEqual({ raw: -35, name: "ES384" });
  });

  it("resolves -36 to ES512", () => {
    expect(resolveAlg(-36)).toEqual({ raw: -36, name: "ES512" });
  });

  it("resolves -258 to RS384", () => {
    expect(resolveAlg(-258)).toEqual({ raw: -258, name: "RS384" });
  });

  it("resolves unknown -47 to raw integer with 'unknown' label", () => {
    expect(resolveAlg(-47)).toEqual({ raw: -47, name: "unknown" });
  });

  it("resolves 0 to unknown", () => {
    expect(resolveAlg(0)).toEqual({ raw: 0, name: "unknown" });
  });
});

describe("resolveKty", () => {
  it("resolves 2 to EC2", () => {
    expect(resolveKty(2)).toEqual({ raw: 2, name: "EC2" });
  });

  it("resolves 3 to RSA", () => {
    expect(resolveKty(3)).toEqual({ raw: 3, name: "RSA" });
  });

  it("resolves 1 to OKP", () => {
    expect(resolveKty(1)).toEqual({ raw: 1, name: "OKP" });
  });

  it("resolves 4 to Symmetric", () => {
    expect(resolveKty(4)).toEqual({ raw: 4, name: "Symmetric" });
  });

  it("resolves unknown 99 to raw integer with 'unknown' label", () => {
    expect(resolveKty(99)).toEqual({ raw: 99, name: "unknown" });
  });
});

describe("resolveCrv", () => {
  it("resolves 1 to P-256", () => {
    expect(resolveCrv(1)).toEqual({ raw: 1, name: "P-256" });
  });

  it("resolves 2 to P-384", () => {
    expect(resolveCrv(2)).toEqual({ raw: 2, name: "P-384" });
  });

  it("resolves 3 to P-521", () => {
    expect(resolveCrv(3)).toEqual({ raw: 3, name: "P-521" });
  });

  it("resolves 6 to Ed25519", () => {
    expect(resolveCrv(6)).toEqual({ raw: 6, name: "Ed25519" });
  });

  it("resolves unknown 99 to raw integer with 'unknown' label", () => {
    expect(resolveCrv(99)).toEqual({ raw: 99, name: "unknown" });
  });
});

describe("resolveCoseKey", () => {
  it("resolves EC2 / ES256 / P-256 key (key 1=2, key 3=-7, key -1=1)", () => {
    const result = resolveCoseKey({ 1: 2, 3: -7, "-1": 1 });
    expect(result.kty).toEqual({ raw: 2, name: "EC2" });
    expect(result.alg).toEqual({ raw: -7, name: "ES256" });
    expect(result.crv).toEqual({ raw: 1, name: "P-256" });
  });

  it("resolves RSA / RS256 key (key 1=3, key 3=-257), no crv", () => {
    const result = resolveCoseKey({ 1: 3, 3: -257 });
    expect(result.kty).toEqual({ raw: 3, name: "RSA" });
    expect(result.alg).toEqual({ raw: -257, name: "RS256" });
    expect(result.crv).toBeUndefined();
  });

  it("includes rawEntries with all original COSE key entries", () => {
    const input = { 1: 2, 3: -7, "-1": 1, "-2": "xcoord", "-3": "ycoord" };
    const result = resolveCoseKey(input);
    expect(result.rawEntries).toEqual(input);
  });

  it("returns 'unknown' name for unrecognized alg value without throwing", () => {
    const result = resolveCoseKey({ 1: 2, 3: -9999 });
    expect(result.alg).toEqual({ raw: -9999, name: "unknown" });
  });

  it("returns 'unknown' name for unrecognized kty value without throwing", () => {
    const result = resolveCoseKey({ 1: 99, 3: -7 });
    expect(result.kty).toEqual({ raw: 99, name: "unknown" });
  });
});
