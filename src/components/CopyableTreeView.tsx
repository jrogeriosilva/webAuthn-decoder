import { useState } from "react"
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy value"
      className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded opacity-0 group-hover/val:opacity-100 text-white bg-white/10 hover:bg-white/20 transition-opacity focus:opacity-100 outline-none"
    >
      {copied ? (
        <Check className="size-3.5 text-green-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

function LeafValue({ value }: { value: string | number | boolean | null }) {
  if (value === null) {
    return (
      <span className="group/val inline-flex items-center">
        <span className="text-[#6b737c]">null</span>
        <CopyButton text="null" />
      </span>
    )
  }
  if (typeof value === "boolean") {
    return (
      <span className="group/val inline-flex items-center">
        <span className="text-[#e5c07b]">{String(value)}</span>
        <CopyButton text={String(value)} />
      </span>
    )
  }
  if (typeof value === "number") {
    return (
      <span className="group/val inline-flex items-center">
        <span className="text-[#61afef]">{value}</span>
        <CopyButton text={String(value)} />
      </span>
    )
  }
  return (
    <span className="group/val inline-flex items-center max-w-full">
      <span className="text-[#98c379] break-all">"{value}"</span>
      <CopyButton text={value} />
    </span>
  )
}

interface TreeNodeProps {
  value: unknown
  depth: number
}

function TreeNode({ value, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const indent = depth * 14

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return <LeafValue value={value as string | number | boolean | null} />
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-[#6b737c]">[]</span>
    }
    return (
      <span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-[#6b737c] hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          <span className="text-xs">[{value.length}]</span>
        </button>
        {expanded && (
          <div style={{ paddingLeft: indent + 14 }}>
            {value.map((item, i) => (
              <div key={i} className="py-px">
                <span className="text-[#6b737c]">{i}: </span>
                <TreeNode value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return <span className="text-[#6b737c]">{"{}"}</span>
    }
    return (
      <span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-[#6b737c] hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          <span className="text-xs">{"{"}…{"}"}</span>
        </button>
        {expanded && (
          <div style={{ paddingLeft: indent + 14 }}>
            {entries.map(([key, val]) => (
              <div key={key} className="py-px">
                <span className="text-[#e06c75] font-medium">{key}</span>
                <span className="text-[#6b737c]">: </span>
                <TreeNode value={val} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-[#6b737c]">{String(value)}</span>
}

export interface CopyableTreeViewProps {
  tree: Record<string, unknown>
}

export function CopyableTreeView({ tree }: CopyableTreeViewProps) {
  return (
    <div
      data-testid="decode-tree"
      className="decode-tree-container font-mono text-[13px] leading-relaxed"
    >
      <div>
        {Object.entries(tree).map(([key, value]) => (
          <div key={key} className="py-px">
            <span className="text-[#e06c75] font-medium">{key}</span>
            <span className="text-[#6b737c]">: </span>
            <TreeNode value={value} depth={0} />
          </div>
        ))}
      </div>
    </div>
  )
}
