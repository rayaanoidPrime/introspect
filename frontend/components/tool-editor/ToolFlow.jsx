import { useCallback, useEffect, useRef } from "react";
import { ToolEditorInput } from "./ToolEditorInput";

// Sample input and output metadata:
// {{
//   "input_metadata": {{
//     "input_1": {{
//         "name": "input_1",
//         "description": "input 1 description",
//         "type": "input_1_type",
//     }},
//     ...
// }},
// "output_metadata": [
//     {{
//         "name": "output_1",
//         "description": "pandas dataframe",
//         "type": "pandas.core.frame.DataFrame",
//     }}
// ],
// }}
/**
 * @typedef {Object} ToolFlowProps
 * @property {string} toolName - Name of the tool
 * @property {{[key: string]: {name: string, description: string, type: string}}} inputMetadata - Metadata of the inputs
 * @property {{name: string, description: string, type: string}[]} outputMetadata - Metadata of the outputs
 */

/**
 * Tool flow diagram
 * @param {ToolFlowProps} props
 */
export function ToolFlow({ toolName, inputMetadata, outputMetadata }) {
  const inputsCtr = useRef(null);
  const outputsCtr = useRef(null);
  const toolNameNode = useRef(null);
  const svg = useRef(null);

  const redraw = useCallback(() => {
    if (
      !inputsCtr.current ||
      !outputsCtr.current ||
      !toolNameNode.current ||
      !svg.current
    )
      return;

    // draw bezeir curves from each input's center right
    // to the tool name's left center
    const inputs = inputsCtr.current.childNodes;
    const outputs = outputsCtr.current.childNodes;
    const toolName = toolNameNode.current;
    const svgEl = svg.current;

    const svgRect = svgEl.getBoundingClientRect();

    // first remove all paths

    svgEl.innerHTML = "";

    const inputCoords = Array.from(inputs).map((input) => {
      // relative to svg
      const inputRect = input.getBoundingClientRect();
      return {
        x: inputRect.right - svgRect.left,
        y: inputRect.top - svgRect.top + inputRect.height / 2,
      };
    });

    const outputCoords = Array.from(outputs).map((output) => {
      const outputRect = output.getBoundingClientRect();
      return {
        x: outputRect.left - svgRect.left,
        y: outputRect.top - svgRect.top + outputRect.height / 2,
      };
    });

    const toolNameRect = toolName.getBoundingClientRect();
    const toolNameCoords = {
      x: toolNameRect.left - svgRect.left,
      y: toolNameRect.top - svgRect.top + toolNameRect.height / 2,
      width: toolNameRect.width,
    };

    inputCoords.forEach((inputCoord, i) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute(
        "d",
        `M ${inputCoord.x} ${inputCoord.y} C ${
          inputCoord.x + 100
        } ${inputCoord.y} ${toolNameCoords.x - 100} ${toolNameCoords.y} ${
          toolNameCoords.x
        } ${toolNameCoords.y}`
      );
      path.setAttribute("stroke", "black");
      path.setAttribute("fill", "transparent");
      svgEl.appendChild(path);
    });

    outputCoords.forEach((outputCoord, i) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute(
        "d",
        `M ${toolNameCoords.x + toolNameCoords.width} ${toolNameCoords.y} C ${
          toolNameCoords.x + 100
        } ${toolNameCoords.y} ${outputCoord.x - 100} ${outputCoord.y} ${
          outputCoord.x
        } ${outputCoord.y}`
      );
      path.setAttribute("stroke", "black");
      path.setAttribute("fill", "transparent");
      svgEl.appendChild(path);
    });
  }, []);

  useEffect(() => {
    redraw();
  }, [outputMetadata, inputMetadata]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, []);

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <div className="absolute left-0 right-0 w-full h-full pointer-events-none">
          <svg ref={svg} width={"100%"} height={"100%"} />
        </div>
        <div className="flex flex-col gap-2 z-[1]" ref={inputsCtr}>
          {Object.values(inputMetadata).map((input, i) => (
            <div className="min-w-20 rounded-md border shadow-sm" key={i}>
              <ToolEditorInput
                name={input.name}
                description={input.description}
              />
            </div>
          ))}
        </div>

        <div
          className="font-bold flex flex-row items-center "
          ref={toolNameNode}
        ></div>

        <div className="flex flex-col gap-2" ref={outputsCtr}>
          {Object.values(outputMetadata).map((output, i) => (
            <div className="min-w-20 rounded-md border shadow-sm" key={i}>
              <ToolEditorInput
                name={output.name}
                description={output.description}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
