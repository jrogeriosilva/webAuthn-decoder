import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

export interface DecodeTreeViewProps {
  tree: Record<string, unknown>;
}

const shouldExpandNode = (): boolean => true;

export function DecodeTreeView({ tree }: DecodeTreeViewProps) {
  return (
    <div
      data-testid="decode-tree"
      className="decode-tree-container bg-card text-foreground font-mono text-[13px]"
    >
      <JsonView
        data={tree}
        style={darkStyles}
        shouldExpandNode={shouldExpandNode}
        clickToExpandNode
      />
    </div>
  );
}
