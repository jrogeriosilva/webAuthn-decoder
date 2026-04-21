import { CopyableTreeView } from "@/components/CopyableTreeView"

export interface DecodeTreeViewProps {
  tree: Record<string, unknown>;
}

export function DecodeTreeView({ tree }: DecodeTreeViewProps) {
  return <CopyableTreeView tree={tree} />
}
