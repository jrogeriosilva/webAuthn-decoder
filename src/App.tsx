import { useState, useEffect } from "react"
import { AppHeader } from "@/components/AppHeader"
import { PayloadInput } from "@/components/PayloadInput"
import { OutputArea } from "@/components/OutputArea"
import { decodePayload, decodeFullCredential } from "@/lib/decode-orchestrator"
import { autoDetectAndDecode } from "@/lib/payload-type-detection"
import { tryExtractPublicKeyCredential } from "@/lib/publickeycredential-input"
import type { PayloadType, DecodeResult } from "@/lib/types"
type DetectedType = PayloadType | "publicKeyCredential"
import type { FormatResult } from "@/lib/format-detection"

function App() {
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null)
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)
  const [detectedType, setDetectedType] = useState<DetectedType | null>(null)
  const [rawInput, setRawInput] = useState("")

  useEffect(() => {
    const envelope = tryExtractPublicKeyCredential(rawInput)
    if (envelope) {
      setDetectedType("publicKeyCredential")
      setDecodeResult(decodeFullCredential(envelope))
      return
    }
    if (formatResult?.ok && formatResult.bytes.byteLength > 0) {
      const { detectedType: dt, result } = autoDetectAndDecode(formatResult.bytes)
      setDetectedType(dt)
      setDecodeResult(result)
    } else {
      setDetectedType(null)
      setDecodeResult(null)
    }
  }, [rawInput, formatResult])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4">
        <AppHeader />
        <main className="flex flex-col gap-8">
          <PayloadInput
            onFormatResult={setFormatResult}
            onRawInput={setRawInput}
          />
          <OutputArea
            decodeResult={decodeResult}
            detectedType={detectedType}
          />
        </main>
      </div>
    </div>
  )
}

export default App
