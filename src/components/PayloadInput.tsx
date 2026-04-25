import { useRef, useState, useMemo, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FormatBadge } from "@/components/FormatBadge"
import { ErrorMessage } from "@/components/ErrorMessage"
import { SamplePayloadsMenu } from "@/components/SamplePayloadsMenu"
import { detectAndNormalize, type FormatResult } from "@/lib/format-detection"
import { debounce } from "@/lib/debounce"
import type { SamplePayload } from "@/data/sample-payloads"

interface PayloadInputProps {
  onFormatResult: (result: FormatResult | null) => void
  onRawInput?: (raw: string) => void
}

export function PayloadInput({ onFormatResult, onRawInput }: PayloadInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<FormatResult | null>(null)

  const detectedFormat = result?.ok ? result.format : null
  const errorMessage = result && !result.ok ? result.error : null

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [])

  const debouncedDetect = useMemo(
    () =>
      debounce((value: string) => {
        if (!value.trim()) {
          setResult(null)
          onFormatResult(null)
          return
        }
        const r = detectAndNormalize(value)
        setResult(r)
        onFormatResult(r)
      }, 300),
    [onFormatResult]
  )

  const detectImmediate = useCallback((value: string) => {
    if (!value.trim()) {
      setResult(null)
      onFormatResult(null)
      return
    }
    const r = detectAndNormalize(value)
    setResult(r)
    onFormatResult(r)
  }, [onFormatResult])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    onRawInput?.(value)
    adjustHeight()
    debouncedDetect(value)
  }

  const handlePaste = () => {
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      setInput(el.value)
      onRawInput?.(el.value)
      adjustHeight()
      detectImmediate(el.value)
    })
  }

  const handleClear = () => {
    setInput("")
    onRawInput?.("")
    setResult(null)
    onFormatResult(null)
    if (textareaRef.current) {
      textareaRef.current.value = ""
      textareaRef.current.style.height = "auto"
      textareaRef.current.focus()
    }
  }

  const handleLoadSample = (sample: SamplePayload) => {
    setInput(sample.raw)
    onRawInput?.(sample.raw)
    requestAnimationFrame(adjustHeight)
    detectImmediate(sample.raw)
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="Paste a base64url, hex, or CBOR payload..."
        className="font-mono text-sm min-h-[120px] max-h-[320px] resize-none bg-card border-border"
        spellCheck={false}
        autoComplete="off"
      />
      <div className="flex items-center justify-between min-h-[28px]">
        <FormatBadge format={detectedFormat} />
        <div className="flex items-center gap-1.5">
          <SamplePayloadsMenu onSelect={handleLoadSample} />
          {input && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              aria-label="Clear input"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      <ErrorMessage error={errorMessage} />
    </div>
  )
}
