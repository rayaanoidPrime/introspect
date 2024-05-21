import React, { Fragment, useEffect, useRef, useState } from "react";

export default function DocNav({}) {
  const [sidebarsOpen, setSidebarsOpen] = useState({
    "analysis-list-sidebar": false,
  });

  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    let ctr = ref.current;
    ctr = Array.from(ctr?.parentNode?.childNodes || []);

    if (!ctr) return;
    // get .content from child nodes
    ctr = ctr.find((d) => d.className === "content");
    if (!ctr) return;

    ctr = ctr.getElementsByClassName("doc-sidebars")?.[0];

    if (!ctr) return;

    let count = 0;

    // if nothing is true, close the ctr
    if (sidebarsOpen["analysis-list-sidebar"]) {
      ctr.classList.add("open");
    } else {
      ctr.classList.remove("open");
    }

    for (let sidebar in sidebarsOpen) {
      let el = ctr.getElementsByClassName(sidebar)?.[0];

      if (!el) return;
      if (sidebarsOpen[sidebar]) {
        el.classList.add("open");
        count++;
      } else {
        el.classList.remove("open");
      }
    }
  }, [sidebarsOpen]);

  function toggleSidebar(sidebarNm) {
    setSidebarsOpen((prev) => {
      return {
        ...prev,
        [sidebarNm]: !prev[sidebarNm],
      };
    });
  }

  return (
    <>
      <div className="editor-nav" ref={ref}>
        <div className="nav-spacer"></div>
        {/* eveything after this spacer is on the right of the nav */}

        <div
          className={
            "nav-analyses nav-sidebar-btn-stick-right " +
            (sidebarsOpen["analysis-list-sidebar"] ? "" : "closed")
          }
          title="List of other docs of this user"
          onClick={(e) => {
            e.preventDefault();

            toggleSidebar("analysis-list-sidebar");
          }}
        >
          Past analyses
        </div>
      </div>
    </>
  );
}
