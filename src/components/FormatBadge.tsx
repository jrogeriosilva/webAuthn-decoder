import { Badge } from "@/components/ui/badge"

interface FormatBadgeProps {
  format: "base64url" | "hex" | "cbor" | null
}

export function FormatBadge({ format }: FormatBadgeProps) {
  if (!format) return null

  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {format}
    </Badge>
  )
}
