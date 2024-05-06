import ThumbsUp from "../../svg/ThumbsUp";
import ThumbsDown from "../../svg/ThumbsDown";
import { useState } from "react";
import GoodModal from "./GoodModal";
import BadModal from "./BadModal";
import { Popover, message } from "antd";
import ErrorBoundary from "../../common/ErrorBoundary";
import setupBaseUrl from "../../../../../utils/setupBaseUrl";

const feedbackUrl = setupBaseUrl("http", "submit_feedback");

export function AnalysisFeedback({ analysisId, analysisSteps }) {
  const [modalVisible, setModalVisible] = useState(null);

  const submitFeedback = async (feedback) => {
    const res = await fetch(feedbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feedback,
        analysis_id: analysisId,
      }),
    })
      .then((d) => d.json())
      .catch((error) => {
        message.error("Failed to submit feedback", error);
        return { success: false, error_message: res.error_message };
      });

    console.log(res);

    if (res.success) {
      message.success("Feedback submitted successfully");
      return { success: true };
    } else {
      message.error("Failed to submit feedback", res);
      return { success: false, error_message: res.error_message };
    }
  };

  return (
    <ErrorBoundary>
      <div className="analysis-feedback flex flex-row content-center">
        <p className="text-sm mr-4 text-gray-400">
          Was this your desired result?
        </p>

        <Popover content="Yep!">
          <div
            className="good-feedback mr-4 h-4 w-4 cursor-pointer"
            onClick={() => {
              setModalVisible("good");
              submitFeedback({ review: "good", analysisId });
            }}
          >
            <ThumbsUp fill="fill-gray-300 hover:fill-medium-blue" />
          </div>
        </Popover>
        <Popover content="Nope">
          <div
            className="bad-feedback h-4 w-4 pt-1 cursor-pointer"
            onClick={() => setModalVisible("bad")}
          >
            <ThumbsDown fill="fill-gray-300 hover:fill-medium-blue" />
          </div>
        </Popover>

        <BadModal
          open={modalVisible === "bad"}
          setModalVisible={setModalVisible}
          analysisSteps={analysisSteps}
          analysisId={analysisId}
          submitFeedback={submitFeedback}
        />
      </div>
    </ErrorBoundary>
  );
}
