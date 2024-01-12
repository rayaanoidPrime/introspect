import { createReactBlockSpec } from "@blocknote/react";
import { createGlobalStyle } from "styled-components";
import { AnalysisAgent } from "../../defog-components/components/agent/AnalysisAgent";
import { v4 } from "uuid";
import ErrorBoundary from "../../defog-components/components/common/ErrorBoundary";

function createAnalysisBlockCss(blockId) {
  return createGlobalStyle`div [data-id="${blockId}"] {
  margin: 0.2em 0 !important;
}`;
}

const AnalysisBlock = createReactBlockSpec(
  {
    type: "analysis",
    propSchema: {
      analysisId: {
        default: null,
      },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const GlobalStyle = createAnalysisBlockCss(block.id);

      const analysisId =
        block.props.analysisId === null
          ? "analysis-" + v4()
          : block.props.analysisId;

      if (!block.props.analysisId) {
        const updatedBlock = editor.updateBlock(block, {
          props: {
            ...block.props,
            analysisId: analysisId,
          },
        });
        // hack to make sure the block has the correct value
        block.props.analysisId = updatedBlock.props.analysisId;
      }

      return (
        <ErrorBoundary>
          <GlobalStyle />
          <AnalysisAgent
            analysisId={analysisId}
            apiToken={editor.apiToken}
            editor={editor}
          />
        </ErrorBoundary>
      );
    },
  }
);

export default AnalysisBlock;
