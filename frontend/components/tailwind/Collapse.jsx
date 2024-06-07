import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export function Collapse({ children, title, rootClassName = "" }) {
  const [collapsed, setCollapsed] = useState(true);
  const ctr = useRef(null);

  return (
    <>
      <div
        style={{ pointerEvents: "all", cursor: "pointer" }}
        className={twMerge("flex flex-row items-center mb-2", rootClassName)}
        onClick={() => {
          setCollapsed(!collapsed);
          if (ctr.current) {
            const contentCtr = ctr.current.querySelector(".content");
            if (contentCtr) {
              ctr.current.style.maxHeight = collapsed
                ? `${contentCtr.scrollHeight}px`
                : "0px";
            }
          }
        }}
      >
        <div>
          <ChevronRightIcon
            className="w-4 inline"
            style={{
              transition: "transform 0.3s ease-in-out",
              marginRight: "3px",
              top: "1px",
              transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
            }}
          />
          {title}
        </div>
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
    </>
  );
}
