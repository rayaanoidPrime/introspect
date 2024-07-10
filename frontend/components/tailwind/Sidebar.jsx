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
  iconClassNames = "",
  iconSize = 4,
  location = "left",
  open = null,
  disableClose = false,
  onChange = (...args) => {},
}) {
  const [sidebarOpen, setSidebarOpen] = useState(disableClose ? true : open);
  const contentRef = useRef(null);
  const contentContainerRef = useRef(null);

  const handleClick = () => {
    if (disableClose) {
      if (!sidebarOpen) setSidebarOpen(true);
      return;
    }

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

  const defaultIconClasses = `toggle-button absolute top-1 rounded-tr-md rounded-br-md bg-inherit p-2 pl-1  self-start z-10 transition-all cursor-pointer ${sidebarOpen ? "right-1" : "-right-7 border border-inherit border-l-0"}`;

  return (
    <div
      className={twMerge(
        "relative flex flex-row border-r",
        rootClassNames,
        sidebarOpen ? openClassNames : closedClassNames
      )}
    >
      <div
        ref={contentContainerRef}
        className="transition-all overflow-hidden grow"
      >
        <div
          className={twMerge("content w-80 block", contentClassNames)}
          ref={contentRef}
        >
          {title ? <h2 className="mb-3 font-sans">{title}</h2> : <></>}
          {children}
        </div>
      </div>
      {!disableClose && (
        <button
          className={twMerge(defaultIconClasses, iconClassNames)}
          onClick={() => handleClick()}
        >
          {location === "left" ? (
            sidebarOpen ? (
              <ArrowLeftStartOnRectangleIcon
                className={`h-${iconSize} w-${iconSize}`}
              />
            ) : (
              <ArrowRightStartOnRectangleIcon
                className={`h-${iconSize} w-${iconSize}`}
              />
            )
          ) : sidebarOpen ? (
            <ArrowRightStartOnRectangleIcon
              className={`h-${iconSize} w-${iconSize}`}
            />
          ) : (
            <ArrowLeftStartOnRectangleIcon
              className={`h-${iconSize} w-${iconSize}`}
            />
          )}
        </button>
      )}
    </div>
  );
}
