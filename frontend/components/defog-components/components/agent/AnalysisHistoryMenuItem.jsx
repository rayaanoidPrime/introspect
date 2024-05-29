import { PlusOutlined } from "@ant-design/icons";

export function AnalysisHistoryMenuItem({
  analysis,
  isActive,
  setActiveAnalysisId,
  setActiveRootAnalysisId,
  setAddToDashboardSelection,
  extraClasses = "",
  isDummy = false,
}) {
  return (
    <div
      className={
        "flex flex-row items-center py-2 px-2 mb-2 hover:cursor-pointer hover:bg-gray-200 " +
        `${isActive ? "font-bold bg-gray-200 " : ""}` +
        extraClasses
      }
      onClick={() => {
        console.log(analysis);
        setActiveRootAnalysisId(analysis?.rootAnalysisId);
        setActiveAnalysisId(analysis?.analysisId);
      }}
    >
      <div className="grow">
        {isDummy ? "New analysis" : analysis?.user_question}
      </div>
      {!isDummy && (
        <div
          className="rounded-sm hover:bg-blue-500 p-1 flex justify-center hover:text-white text-gray-300 group "
          onClick={() => {
            setActiveAnalysisId(analysis?.analysisId);
            // add this to a dashboard
            setAddToDashboardSelection(analysis);
          }}
        >
          <PlusOutlined />
        </div>
      )}
    </div>
  );
}
