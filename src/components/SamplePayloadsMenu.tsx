import { Menu } from "@base-ui/react/menu"
import { Sparkles, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSamplePayloads, type SamplePayload } from "@/data/sample-payloads"

interface SamplePayloadsMenuProps {
  onSelect: (sample: SamplePayload) => void
}

export function SamplePayloadsMenu({ onSelect }: SamplePayloadsMenuProps) {
  const samples = getSamplePayloads()

  return (
    <Menu.Root>
      <Menu.Trigger
        render={(props) => (
          <Button
            variant="outline"
            size="sm"
            aria-label="Load sample payload"
            className="gap-1.5"
            {...props}
          >
            <Sparkles className="size-3.5" />
            Load sample
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        )}
      />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup
            className="min-w-[280px] max-w-[360px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
          >
            {samples.map((sample) => (
              <Menu.Item
                key={sample.id}
                onClick={() => onSelect(sample)}
                className="flex cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
              >
                <span className="font-medium leading-tight">{sample.label}</span>
                <span className="text-xs text-muted-foreground leading-snug">
                  {sample.description}
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
