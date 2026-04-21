import type { DecodeResult } from "@/lib/types"
import { preprocessForTree } from "@/lib/tree-preprocess"
import { DecodeTreeView } from "@/components/DecodeTreeView"

interface OutputAreaProps {
  decodeResult: DecodeResult | null
}

export function OutputArea({ decodeResult }: OutputAreaProps) {
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
      <DecodeTreeView tree={tree} />
    </div>
  )
}
