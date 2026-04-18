import { useRef, useState, useMemo, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FormatBadge } from "@/components/FormatBadge"
import { ErrorMessage } from "@/components/ErrorMessage"
import { detectAndNormalize, type FormatResult } from "@/lib/format-detection"
import { debounce } from "@/lib/debounce"
import type { PayloadType } from "@/lib/types"

interface PayloadInputProps {
  payloadType: PayloadType
  onPayloadTypeChange: (type: PayloadType) => void
  onFormatResult: (result: FormatResult | null) => void
  onRawInput?: (raw: string) => void
}

export function PayloadInput({ payloadType, onPayloadTypeChange, onFormatResult, onRawInput }: PayloadInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<FormatResult | null>(null)

  // Derived state from result
  const detectedFormat = result?.ok ? result.format : null
  const errorMessage = result && !result.ok ? result.error : null

  // Auto-resize textarea: min 120px, max 320px, then scroll (D-02)
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [])

  // Debounced detection for keystrokes (300ms per UI-SPEC)
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

  // Immediate detection (for paste events)
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

  // onChange handler: update state, resize, debounced detect (D-04)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    onRawInput?.(value)
    adjustHeight()
    debouncedDetect(value)
  }

  // onPaste handler: detect immediately, no debounce (UI-SPEC anti-pattern)
  const handlePaste = () => {
    // Use requestAnimationFrame to read the value after paste completes
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      setInput(el.value)
      onRawInput?.(el.value)
      adjustHeight()
      detectImmediate(el.value)
    })
  }

  // Clear button handler (D-03): reset everything
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="payload-type" className="text-sm font-medium text-muted-foreground">
          Payload Type
        </label>
        <select
          id="payload-type"
          value={payloadType}
          onChange={(e) => onPayloadTypeChange(e.target.value as PayloadType)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="registration">Registration</option>
          <option value="authentication">Authentication</option>
          <option value="clientDataJSON">clientDataJSON</option>
          <option value="raw-cbor">Raw CBOR</option>
        </select>
      </div>
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
      <ErrorMessage error={errorMessage} />
    </div>
  )
}
