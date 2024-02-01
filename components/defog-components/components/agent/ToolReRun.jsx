import { Button } from "antd";

export function ToolReRun({
  onClick = () => {},
  text = "Re run",
  loading = false,
}) {
  return (
    <div
      className={"tool-re-run" + (loading ? " tool-re-run-loading" : "")}
      onClick={onClick}
    >
      <p>{text}</p>
    </div>
  );
}
