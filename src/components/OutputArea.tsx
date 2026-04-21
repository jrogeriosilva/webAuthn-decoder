import type { DecodeResult, PayloadType } from "@/lib/types"
import { preprocessForTree } from "@/lib/tree-preprocess"
import { DecodeTreeView } from "@/components/DecodeTreeView"
import { Badge } from "@/components/ui/badge"
import { payloadTypeLabel } from "@/lib/payload-type-detection"

type DetectedType = PayloadType | "publicKeyCredential"

interface OutputAreaProps {
  decodeResult: DecodeResult | null
  detectedType: DetectedType | null
}

export function OutputArea({ decodeResult, detectedType }: OutputAreaProps) {
  if (!decodeResult) {
    return (
      <div className="min-h-[200px] rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        Decoded output will appear here
      </div>
    )
  }

  if (!decodeResult.ok) {
    return (
      <div className="min-h-[200px] rounded-md border border-destructive/50 bg-card p-4">
        <p className="text-sm font-medium text-destructive">{decodeResult.error}</p>
        {decodeResult.suggestion && (
          <p className="mt-1 text-sm text-muted-foreground">{decodeResult.suggestion}</p>
        )}
      </div>
    )
  }

  const { tree } = preprocessForTree(decodeResult)

  return (
    <div className="min-h-[200px] rounded-md border border-border bg-card p-4">
      {detectedType && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Detected</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {payloadTypeLabel(detectedType)}
          </Badge>
        </div>
      )}
      <DecodeTreeView tree={tree} />
    </div>
  )
}
