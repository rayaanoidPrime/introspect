import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";

import "prismjs/themes/prism.css";
import React, { useMemo, useState } from "react";
import ErrorBoundary from "./common/ErrorBoundary";

export function CodeEditor({
  analysisId = null,
  toolRunId = null,
  code = null,
  language = "sql",
  updateProp = null,
  className = "",
  handleEdit = () => {},
}) {
  const [toolCode, setToolCode] = useState(code);

  const updateCodeAndSql = (newVal) => {
    // update values of the code and the SQL
    if (updateProp !== "sql" && updateProp !== "code_str") return;
    if (!toolRunId) return;
    if (!analysisId) return;
    if (!newVal) return;

    handleEdit({
      tool_run_id: toolRunId,
      update_prop: updateProp,
      new_val: newVal,
      analysis_id: analysisId,
    });
    setToolCode(newVal);
  };

  return (
    <ErrorBoundary>
      <>
        <Editor
          className={`language-${language} ` + className}
          value={toolCode}
          highlight={(code) => {
            return highlight(code, languages[language], language);
          }}
          onValueChange={(newVal) => {
            updateCodeAndSql(newVal);
          }}
        />
      </>
    </ErrorBoundary>
  );
}
