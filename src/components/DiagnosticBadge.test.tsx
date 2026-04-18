import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DiagnosticBadge } from "./DiagnosticBadge";
import type { DiagnosticAnnotation } from "@/lib/types";

describe("DiagnosticBadge", () => {
  it("renders field path and message for warning severity", () => {
    const annotation: DiagnosticAnnotation = {
      fieldPath: "authData.flags.at",
      severity: "warning",
      message: "AT flag is false but attestedCredentialData is present",
    };
    const { container } = render(<DiagnosticBadge annotation={annotation} />);
    expect(container.textContent).toContain("authData.flags.at");
    expect(container.textContent).toContain(
      "AT flag is false but attestedCredentialData is present"
    );
    // Badge should use warning variant
    const badge = container.querySelector("[data-testid='diagnostic-badge']");
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain("WARNING");
  });

  it("renders destructive badge for error severity", () => {
    const annotation: DiagnosticAnnotation = {
      fieldPath: "attestedCredentialData.credentialId",
      severity: "error",
      message: "Credential ID mismatch",
    };
    const { container } = render(<DiagnosticBadge annotation={annotation} />);
    expect(container.textContent).toContain("ERROR");
    expect(container.textContent).toContain("Credential ID mismatch");
  });
});
