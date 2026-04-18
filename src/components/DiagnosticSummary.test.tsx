import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DiagnosticSummary } from "./DiagnosticSummary";
import type { DiagnosticAnnotation } from "@/lib/types";

describe("DiagnosticSummary", () => {
  it("renders nothing when annotations is empty", () => {
    const { container } = render(<DiagnosticSummary annotations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders two DiagnosticBadge rows for two annotations", () => {
    const a1: DiagnosticAnnotation = {
      fieldPath: "authData.flags.up",
      severity: "warning",
      message: "UP flag is false",
    };
    const a2: DiagnosticAnnotation = {
      fieldPath: "credentialId",
      severity: "error",
      message: "Credential ID mismatch",
    };
    const { container } = render(
      <DiagnosticSummary annotations={[a1, a2]} />
    );
    const badges = container.querySelectorAll(
      '[data-testid="diagnostic-badge"]'
    );
    expect(badges.length).toBe(2);
  });
});
