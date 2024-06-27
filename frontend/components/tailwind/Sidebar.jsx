// sidebar that can be toggled open and closed

import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Collapse } from "./Collapse";

export default function Sidebar({
  title = "Menu",
  children,
  rootClassNames = "",
  contentClassNames = "",
  location = "left",
}) {
  const [open, setOpen] = useState(true);
  const contentRef = useRef(null);
  const contentContainerRef = useRef(null);

  const handleClick = () => {
    if (!contentContainerRef.current || !contentRef.current) return;
    // if opening, set container width to children width
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!contentContainerRef.current || !contentRef.current) return;
    if (open) {
      contentContainerRef.current.style.width = `${contentRef.current.clientWidth}px`;
    } else {
      contentContainerRef.current.style.width = `0px`;
    }
  }, [open]);

  useEffect(() => {
    if (!contentContainerRef.current || !contentRef.current) return;
    contentContainerRef.current.style.width = `${contentRef.current.clientWidth}px`;
  }, []);

  return (
    <div className={twMerge("relative", rootClassNames)}>
      <button
        className={`toggle-button absolute z-10 ${location === "left" ? (open ? "right-5 top-5" : "-right-5 top-5") : open ? "-left-5 top-5" : "right-5 top-5"} cursor-pointer`}
        onClick={() => handleClick()}
      >
        {location === "left" ? (
          open ? (
            <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
          ) : (
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          )
        ) : open ? (
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
