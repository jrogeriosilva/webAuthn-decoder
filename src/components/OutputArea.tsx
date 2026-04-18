import type { DecodeResult, PayloadType } from "@/lib/types"
import { preprocessForTree } from "@/lib/tree-preprocess"
import { DecodeTreeView } from "@/components/DecodeTreeView"
import { DiagnosticSummary } from "@/components/DiagnosticSummary"
import { ByteOffsetMap } from "@/components/ByteOffsetMap"

interface OutputAreaProps {
  decodeResult: DecodeResult | null
  payloadType: PayloadType
  rawId?: Uint8Array
}

export function OutputArea({ decodeResult, payloadType, rawId }: OutputAreaProps) {
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

  const { tree, annotations } = preprocessForTree(decodeResult, payloadType, { rawId })

  // Byte offset map appears only when we have authenticatorData bytes.
  let byteOffsetMap: React.ReactNode = null
  if (decodeResult.type === "attestationObject") {
    byteOffsetMap = (
      <ByteOffsetMap
        authData={decodeResult.data.authData}
        rawAuthDataLength={decodeResult.data.rawAuthData.length}
      />
    )
  } else if (decodeResult.type === "assertion") {
    const ad = decodeResult.data.authenticatorData
    const approxLength =
      37 +
      (ad.attestedCredentialData
        ? 18 + ad.attestedCredentialData.credentialIdLength + 64
        : 0)
    byteOffsetMap = <ByteOffsetMap authData={ad} rawAuthDataLength={approxLength} />
  }

  return (
    <div className="min-h-[200px] rounded-md border border-border bg-card p-4">
      {byteOffsetMap}
      <DecodeTreeView tree={tree} />
      <DiagnosticSummary annotations={annotations} />
    </div>
  )
}
