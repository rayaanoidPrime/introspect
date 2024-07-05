// sidebar that can be toggled open and closed
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  QueueListIcon,
} from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function Sidebar({
  title = "Menu",
  children,
  rootClassNames = "",
  contentClassNames = "",
  openClassNames = "",
  closedClassNames = "",
  location = "left",
  open = null,
  onChange = (...args) => {},
}) {
  const [sidebarOpen, setSidebarOpen] = useState(open);
  const contentRef = useRef(null);
  const contentContainerRef = useRef(null);

  const handleClick = () => {
    if (!contentContainerRef.current || !contentRef.current) return;
    // if opening, set container width to children width
    setSidebarOpen((prev) => !prev);
    onChange(!sidebarOpen);
  };

  useEffect(() => {
    setSidebarOpen(open);
  }, [open]);

  useEffect(() => {
    if (!contentContainerRef.current || !contentRef.current) return;

    if (sidebarOpen) {
      contentContainerRef.current.style.width = `${contentRef.current.clientWidth}px`;
    } else {
      contentContainerRef.current.style.width = `0px`;
    }
  }, [sidebarOpen]);

  return (
    <div
      className={twMerge(
        "relative",
        rootClassNames,
        sidebarOpen ? openClassNames : closedClassNames
      )}
    >
      <button
        className={`toggle-button absolute z-10 transition-all ${location === "left" ? (sidebarOpen ? "right-5 top-5" : "-right-5 top-5") : sidebarOpen ? "-left-5 top-5" : "right-5 top-5"} cursor-pointer`}
        onClick={() => handleClick()}
      >
        {location === "left" ? (
          sidebarOpen ? (
            <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
          ) : (
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          )
        ) : sidebarOpen ? (
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
        ) : (
          <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
        )}
      </button>
      <div
        ref={contentContainerRef}
        className="transition-all overflow-hidden pb-4"
      >
        <div
          className={twMerge("content w-80 ", contentClassNames)}
          ref={contentRef}
        >
          {title ? <h2 className="mb-3 font-sans">{title}</h2> : <></>}
          {children}
        </div>
      </div>
    </div>
  );
}
