import React from "react";

export default function Popover({ children, content }) {
  return (
    <div className="relative group">
      {content ? (
        <div className="popover-panel absolute w-fit hidden group-hover:block p-4 bg-white text-gray-600 bottom-full pointer-events-none z-10 left-1/2 -translate-x-1/2 mx-auto rounded-md border border-gray-400">
          {content}
        </div>
      ) : (
        <></>
      )}
      {children}
    </div>
  );
}
