"use client";
import { DefogAnalysisAgentEmbed } from "@defogdotai/agents-ui-components/agent";

export function TestDrive({ token, dbs, devMode }) {
  return (
    <DefogAnalysisAgentEmbed
      apiEndpoint={process.env.NEXT_PUBLIC_AGENTS_ENDPOINT || ""}
      token={token}
      // these are the ones that will be shown for new csvs uploaded
      uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
      searchBarDraggable={true}
      // searchBarClasses="sticky bottom-2"
      dbs={dbs}
      disableMessages={false}
      devMode={devMode}
    />
  );
}
