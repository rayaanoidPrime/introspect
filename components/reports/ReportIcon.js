import React from "react";
import styled from "styled-components";
import { CheckOutlined } from "@ant-design/icons";

const stages = {
  Clarify: "clarify",
  // Understand: "understand",
  Approaches: "gen_approaches",
  Report: "gen_report",
};

export default function ReportIcon({ report, addReportIcon = false }) {
  const stagesDone = addReportIcon
    ? []
    : Object.keys(stages).map((s) => {
        return [s, report[stages[s]] && report[stages[s]].success];
      });

  return (
    <ReportIconWrap>
      <div className={"report-icon " + (addReportIcon ? "add-report" : "")}>
        {addReportIcon ? (
          // a full width plus sign so it aligns center vertically
          // https://stackoverflow.com/questions/49491565/uibutton-label-text-vertical-alignment-for-plus-and-minus
          <p className="add-report-plus">＋</p>
        ) : (
          <>
            {stagesDone.map(([stage, done]) => {
              return (
                <span
                  key={stage}
                  className={"stage-icon-label " + (done ? "done" : "")}
                >
                  {stage}
                  {done ? <CheckOutlined /> : <></>}
                </span>
              );
            })}
          </>
        )}
      </div>

      <p className="report-title">
        {addReportIcon
          ? "New report"
          : report.user_question
          ? report.user_question
          : "Untitled"}
      </p>
      <p className="report-date">
        {addReportIcon
          ? ""
          : // short string like 28 Aug, 2023
            report?.timestamp?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
      </p>
    </ReportIconWrap>
  );
}

const ReportIconWrap = styled.div`
  width: 200px;
  margin: 10px;
  margin-bottom: 2em;
  .report-icon {
    border-radius: 8px;
    width: 100%;
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: left;
    background: #a8b1c021;
    flex-direction: column;
    padding: 20px;

    &.add-report {
      align-items: center;
      .add-report-plus {
        font-size: 3rem;
        font-weight: bold;
        color: #a8b1c0c3;
      }
    }
    .stage-icon-label {
      color: #a8b1c0ff;
      font-weight: bold;
      &.done {
        color: #a8b1c061;
        text-decoration: line-through;
        .anticon {
          margin-left: 4px;
        }
      }
    }
  }
  .report-title {
    color: #a8b1c0ff;
    font-weight: bold;
    margin-top: 1em;
  }
  .report-date {
    color: #a8b1c0ff;
    font-weight: bold;
  }
`;
