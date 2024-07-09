import { twMerge } from "tailwind-merge";

export function NavBar({ rootClassNames = "", children }) {
  return <div className={twMerge("w-full", rootClassNames)}>{children}</div>;
}
