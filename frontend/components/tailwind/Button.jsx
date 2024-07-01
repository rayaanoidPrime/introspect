import React from "react";
import { twMerge } from "tailwind-merge";

// a button component with onclick, className and children props
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
          ? "bg-gray-50 text-gray-300 hover:bg-gray-50 cursor-not-allowed"
          : "",
        className
      )}
    >
      {children}
    </button>
  );
};
