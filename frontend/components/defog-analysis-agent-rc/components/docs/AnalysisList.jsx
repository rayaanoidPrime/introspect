// a place to display various things avaialble to this user for the doc
// for example analyses, or other things

import React, { useContext, useEffect, useRef, useState } from "react";
import { DocContext } from "./DocContext";
import { Input } from "antd";
import ErrorBoundary from "../../../defog-components/components/common/ErrorBoundary";

export function AnalysisList({ setId = () => {} }) {
  const docContext = useContext(DocContext);
  const analysesRef = useRef(null);
  const [searchText, setSearchText] = useState("");

  const items = docContext?.val?.userItems?.analyses || [];

  return (
    <ErrorBoundary>
      <div className="sidebar analysis-list-sidebar" ref={analysesRef}>
        <Input
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Filter your old analysis"
        />
        <div className="sidebar-content">
          {items.length
            ? items
                .filter((d) => d && d.user_question !== "")
                .filter((d) => d && d?.user_question?.includes(searchText))
                .map((analysis, i) => (
                  <div
                    key={analysis.report_id}
                    className={`analysis-list-sidebar-item analysis-list-${analysis.report_id}`}
                    onClick={() => setId(analysis.report_id)}
                  >
                    <span>{analysis.user_question}</span>
                  </div>
                ))
            : "No past analyses found. Did you provide your api token?"}
        </div>
      </div>
    </ErrorBoundary>
  );
}
