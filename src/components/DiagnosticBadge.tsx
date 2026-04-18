import { Badge } from "@/components/ui/badge";
import type { DiagnosticAnnotation } from "@/lib/types";

export interface DiagnosticBadgeProps {
  annotation: DiagnosticAnnotation;
}

export function DiagnosticBadge({ annotation }: DiagnosticBadgeProps) {
  const variant = annotation.severity === "error" ? "destructive" : "warning";
  const label = annotation.severity === "error" ? "ERROR" : "WARNING";
  return (
    <div data-testid="diagnostic-badge" className="flex items-start gap-2">
      <Badge variant={variant}>{label}</Badge>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-xs text-muted-foreground">
          {annotation.fieldPath}
        </span>
        <span className="text-sm leading-normal">{annotation.message}</span>
      </div>
    </div>
  );
}
