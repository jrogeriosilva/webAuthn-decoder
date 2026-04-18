import { DiagnosticBadge } from "@/components/DiagnosticBadge";
import type { DiagnosticAnnotation } from "@/lib/types";

export interface DiagnosticSummaryProps {
  annotations: DiagnosticAnnotation[];
}

export function DiagnosticSummary({ annotations }: DiagnosticSummaryProps) {
  if (annotations.length === 0) return null;
  return (
    <div data-testid="diagnostic-summary" className="mt-6 flex flex-col gap-2">
      {annotations.map((a, i) => (
        <DiagnosticBadge key={`${a.fieldPath}-${i}`} annotation={a} />
      ))}
    </div>
  );
}
