import { Button } from "$components/tailwind/Button";
import { twMerge } from "tailwind-merge";

export function ToolReRun({
  onClick = () => {},
  text = "Re run",
  loading = false,
  className = "tool-re-run",
}) {
  return (
    <Button disabled={loading} className={twMerge(className)} onClick={onClick}>
      <p>{text}</p>
    </Button>
  );
}
