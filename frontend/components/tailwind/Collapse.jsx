import { ChevronRightIcon } from "@heroicons/react/20/solid";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

let timeout,
  count = 0;
export function Collapse({
  children,
  title,
  rootClassName = "",
  headerClassNames = "",
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ctr = useRef(null);
  const [haveHeight, setHaveHeight] = useState(false);

  function setHeight() {
    if (count > 10) return;

    if (ctr.current) {
      const contentCtr = ctr.current.querySelector(".content");
      if (contentCtr) {
        if (contentCtr.offsetHeight > 0) {
          setHaveHeight(true);
          ctr.current.style.maxHeight = !collapsed
            ? `${contentCtr.offsetHeight}px`
            : "0px";
        } else {
          timeout = setTimeout(() => {
            count++;
            if (count > 10) {
              clearTimeout(timeout);
            }

            setHeight();
          }, 300);
        }
      }
    }
  }

  useEffect(() => {
    setHeight();
    return () => {
      clearTimeout(timeout);
    };
  }, [collapsed]);

  console.log("Renrdering;");

  return (
    <>
      <div
        className={twMerge(
          "flex flex-col max-h-96 mb-2 pointer-events-auto cursor-pointer",
          rootClassName
        )}
      >
        <div
          className={twMerge("h-10 flex items-center", headerClassNames)}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setCollapsed(!collapsed);
          }}
        >
          <ChevronRightIcon
            className="w-4 h-4 inline fill-gray-500"
            style={{
              transition: "transform 0.3s ease-in-out",
              marginRight: "3px",
              top: "1px",
              transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
            }}
          />
          <span className="font-bold text-md">{title}</span>
        </div>
        <div
          ref={ctr}
          style={{
            overflow: "hidden",
            maxHeight: "0px",
            transition: "max-height 0.6s ease-in-out",
          }}
        >
          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
