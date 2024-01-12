import { NodeViewWrapper } from "@tiptap/react";
import React, { useRef } from "react";

export default function ReactiveVariableNodeView({ node }) {
  const ref = useRef(null);
  return (
    <NodeViewWrapper as="span">
      <div data-drag-handle></div>
      <code data-reactive-var="true">{node.attrs["data-val"]}</code>
    </NodeViewWrapper>
  );
}
