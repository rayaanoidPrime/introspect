import { twMerge } from "tailwind-merge";

// create a button component with onclick, className and children props
export const Button = ({
  onClick = () => {},
  className = "",
  children = null,
  disabled = false,
}) => {
  return (
    <button
      disabled={disabled}
      onClick={(ev) => {
        if (disabled) return;
        onClick(ev);
      }}
      className={twMerge(
        "px-2 py-1 rounded-md text-white bg-blue-500 text-xs hover:bg-blue-600",
        disabled
          ? "cursor-not-allowed bg-gray-100 text-gray-400 hover:bg-gray-100"
          : "",
        className
      )}
    >
      {children}
    </button>
  );
};
