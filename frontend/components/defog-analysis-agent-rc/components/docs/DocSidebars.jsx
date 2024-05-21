import React from "react";
import { AnalysisList } from "./AnalysisList";

export function DocSidebars({ setId = () => {} }) {
  return (
    <div className="doc-sidebars">
      <AnalysisList setId={setId} />
    </div>
  );
}
