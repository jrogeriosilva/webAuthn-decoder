import { useState, useMemo } from "react"
import { AppHeader } from "@/components/AppHeader"
import { PayloadInput } from "@/components/PayloadInput"
import { OutputArea } from "@/components/OutputArea"
import { EducationalContent } from "@/components/EducationalContent"
import { decodeFullCredential } from "@/lib/decode-orchestrator"
import { autoDetectAndDecode } from "@/lib/payload-type-detection"
import { tryExtractPublicKeyCredential } from "@/lib/publickeycredential-input"
import type { PayloadType, DecodeResult } from "@/lib/types"
type DetectedType = PayloadType | "publicKeyCredential"
import type { FormatResult } from "@/lib/format-detection"

function App() {
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null)
  const [rawInput, setRawInput] = useState("")

  const { detectedType, decodeResult } = useMemo((): {
    detectedType: DetectedType | null
    decodeResult: DecodeResult | null
  } => {
    const envelope = tryExtractPublicKeyCredential(rawInput)
    if (envelope) {
      return { detectedType: "publicKeyCredential", decodeResult: decodeFullCredential(envelope) }
    }
    if (formatResult?.ok && formatResult.bytes.byteLength > 0) {
      const { detectedType: dt, result } = autoDetectAndDecode(formatResult.bytes)
      return { detectedType: dt, decodeResult: result }
    }
    return { detectedType: null, decodeResult: null }
  }, [rawInput, formatResult])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4">
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
          <EducationalContent />
        </main>
      </div>
    </div>
  )
}

export default App
