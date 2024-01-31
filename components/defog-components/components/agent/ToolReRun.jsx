export function ToolReRun({ onClick = () => {}, text = "Re run" }) {
  return (
    <div className="tool-re-run" onClick={onClick}>
      <p>{text}</p>
    </div>
  );
}
