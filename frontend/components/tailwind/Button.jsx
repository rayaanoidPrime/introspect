import { twMerge } from "tailwind-merge";

// create a button component with onclick, className and children props
export const Button = ({ onClick = () => {}, className, children = null }) => {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "px-2 py-1 rounded-md text-white bg-blue-500 text-xs hover:bg-blue-600",
        className
      )}
    >
      {children}
    </button>
  );
};
