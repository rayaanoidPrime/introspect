import { CodeEditor } from "../CodeEditor";

export function ToolRunOutputList({
  analysisId,
  toolRunId,
  step,
  sql = null,
  codeStr = null,
  handleEdit = () => {},
  availableOutputNodes = [],
  setActiveNode,
}) {
  //   parse outputs
  //   each output is a node somewhere in the dag

  return (
    <div className="tool-output-list">
      <div className="tool-code">
        {sql && (
          <>
            <p className="tool-code-header">SQL</p>
            <CodeEditor
              key={sql}
              className="tool-code-ctr"
              analysisId={analysisId}
              toolRunId={toolRunId}
              code={sql}
              handleEdit={handleEdit}
              updateProp={"sql"}
            ></CodeEditor>
          </>
        )}
        {codeStr && (
          <>
            <p className="tool-code-header">Code</p>
            <CodeEditor
              key={codeStr}
              className="tool-code-ctr"
              analysisId={analysisId}
              toolRunId={toolRunId}
              code={codeStr}
              language="python"
              handleEdit={handleEdit}
              updateProp={"code_str"}
            ></CodeEditor>
          </>
        )}
      </div>
      <div className="tool-output-data">
        <p className="tool-output-data-header">Datasets</p>
        {step.outputs_storage_keys.map((output, i) => {
          return (
            <div
              key={i}
              className="tool-output-data-value"
              onClick={() => {
                const exists = availableOutputNodes.find(
                  (node) => node.data.id === output
                );
                if (exists) {
                  setActiveNode(exists);
                }
              }}
              onMouseOver={(ev) => {
                // get the closest .analysis-content to the mouseovered element
                const closest = ev.target.closest(".analysis-content");
                if (!closest) return;
                // now get the closest .graph-node with the class name output
                const node = closest.querySelector(`.graph-node.${output}`);
                if (!node) return;
                // add a class highlighted
                node.classList.add("highlighted");
              }}
              onMouseOut={(ev) => {
                // get the closest .analysis-content to the mouseovered element
                const closest = ev.target.closest(".analysis-content");
                if (!closest) return;
                // now get the closest .graph-node with the class name output
                const node = closest.querySelector(`.graph-node.${output}`);
                if (!node) return;
                // remove the class highlighted
                node.classList.remove("highlighted");
              }}
            >
              <span>{output}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
