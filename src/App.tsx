import { useState, useEffect } from "react"
import { AppHeader } from "@/components/AppHeader"
import { PayloadInput } from "@/components/PayloadInput"
import { OutputArea } from "@/components/OutputArea"
import { decodePayload } from "@/lib/decode-orchestrator"
import { tryExtractPublicKeyCredential } from "@/lib/publickeycredential-input"
import type { PayloadType, DecodeResult } from "@/lib/types"
import type { FormatResult } from "@/lib/format-detection"

function App() {
  const [payloadType, setPayloadType] = useState<PayloadType>("registration")
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null)
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)
  const [rawInput, setRawInput] = useState("")
  const [rawId, setRawId] = useState<Uint8Array | undefined>(undefined)
  const [inferredPayloadType, setInferredPayloadType] = useState<PayloadType | undefined>(undefined)

  useEffect(() => {
    const envelope = tryExtractPublicKeyCredential(rawInput)
    if (envelope) {
      const innerType: PayloadType =
        envelope.innerKind === "attestationObject" ? "registration" : "authentication"
      setRawId(envelope.rawId)
      setInferredPayloadType(innerType)
      setDecodeResult(decodePayload(innerType, envelope.innerBytes))
      return
    }
    setRawId(undefined)
    setInferredPayloadType(undefined)
    if (formatResult?.ok) {
      setDecodeResult(decodePayload(payloadType, formatResult.bytes))
    } else {
      setDecodeResult(null)
    }
  }, [rawInput, formatResult, payloadType])

  const effectivePayloadType: PayloadType = inferredPayloadType ?? payloadType

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4">
        <AppHeader />
        <main className="flex flex-col gap-8">
          <PayloadInput
            payloadType={payloadType}
            onPayloadTypeChange={setPayloadType}
            onFormatResult={setFormatResult}
            onRawInput={setRawInput}
          />
          <OutputArea
            decodeResult={decodeResult}
            payloadType={effectivePayloadType}
            rawId={rawId}
          />
        </main>
      </div>
    </div>
  )
}

export default App
