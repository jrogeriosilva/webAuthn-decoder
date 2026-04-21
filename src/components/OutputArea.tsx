import { useState } from "react"
import { Copy, Check } from "lucide-react"
import type { DecodeResult, PayloadType } from "@/lib/types"
import { preprocessForTree } from "@/lib/tree-preprocess"
import { DecodeTreeView } from "@/components/DecodeTreeView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { payloadTypeLabel } from "@/lib/payload-type-detection"

type DetectedType = PayloadType | "publicKeyCredential"

interface OutputAreaProps {
  decodeResult: DecodeResult | null
  detectedType: DetectedType | null
}

function CopyAllButton({ tree }: { tree: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(tree, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <><Check className="size-3.5 text-green-500" />Copied</>
      ) : (
        <><Copy className="size-3.5" />Copy all</>
      )}
    </Button>
  )
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {detectedType && (
            <>
              <span className="text-xs text-muted-foreground">Detected</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {payloadTypeLabel(detectedType)}
              </Badge>
            </>
          )}
        </div>
        <CopyAllButton tree={tree} />
      </div>
      <DecodeTreeView tree={tree} />
    </div>
  )
}
