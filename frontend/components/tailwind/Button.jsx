import React from "react";
import { twMerge } from "tailwind-merge";

// a button component with onclick, className and children props
export default function Button({
  id = null,
  onClick = (...args) => {},
  className = "",
  children = null,
  disabled = false,
}) {
  return (
    <button
      id={id}
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
}
