import { python } from "@codemirror/lang-python";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useRef } from "react";
import { EditorView } from "@codemirror/view";

export default function ToolCodeEditor({ toolCode }) {
  const editor = useRef(null);

  return (
    <ReactCodeMirror
      ref={editor}
      className={"*:outline-0 *:focus:outline-0 "}
      value={toolCode}
      extensions={[python(), EditorView.lineWrapping]}
      basicSetup={{
        lineNumbers: false,
        highlightActiveLine: false,
      }}
    />
  );
}
