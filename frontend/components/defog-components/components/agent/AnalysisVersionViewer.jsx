import { Input, message } from "antd";
import { useRef, useState } from "react";
import { v4 } from "uuid";
import { AnalysisAgent } from "./AnalysisAgent";

const defaultProps = {
  rootAnalysisId: null,
  username: null,
  analysisVersionList: [
    {
      user_question: "New analysis",
      analysis_id: "dummy",
    },
  ],
};

function AnalysisVersionViewer(props) {
  props = { ...defaultProps, ...props };
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(
    props?.analysisVersionList?.length - 1 >= 0
      ? props?.analysisVersionList?.length - 1
      : 0
  );

  const [analysisVersionList, setAnalysisVersionList] = useState(
    props?.analysisVersionList
  );

  const [renderedTabs, setRenderedTabs] = useState([]); // store the rendered tabs so we don't keep re rendering them

  const [rootAnalysis, setRootAnalysis] = useState(props?.rootAnalysisId); // this is the root analysis

  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // raise error if:
  // 1. we don't have analysisVersionList, but have a rootAnalysisId
  // 2. we have analysisVersionList, but don't have a rootAnalysisId
  // 3. root anlaysis is not a valid object
  // 4. analysisVersionList is not an array
  // 5. each item in analysisVersionList should have an analysis_id and user_question
  // 6. root analysis object should have an analysis_id and user_question
  // 7. we have a username

  if (
    (!analysisVersionList && rootAnalysis) ||
    (rootAnalysis && typeof rootAnalysis !== "object") ||
    (analysisVersionList && !Array.isArray(analysisVersionList)) ||
    (analysisVersionList &&
      analysisVersionList.some(
        (item) => !item.analysis_id || !item.user_question
      )) ||
    (rootAnalysis &&
      (!rootAnalysis.analysis_id || !rootAnalysis.user_question)) ||
    !props.username
  ) {
    message.error("Invalid props passed to AnalysisVersionViewer");
    return;
  }

  const handleSubmit = () => {
    try {
      setLoading(true);
      let newAnalysisId = null;

      // this is extra stuff we will send to the backend when creating an entry
      // in the db
      let createAnalysisRequestExtraParams = {
        user_question: searchRef.current.input.value,
        // if rootAnalysis is not defined, means we're starting something from scratch
        is_root_analysis: !rootAnalysis,
      };

      if (!rootAnalysis) {
        newAnalysisId = "analysis-" + v4();
        setRootAnalysis({
          analysis_id: newAnalysisId,
          user_question: searchRef.current.input.value,
        });
        createAnalysisRequestExtraParams.is_root_analysis = true;
      } else {
        // else create a new version of the root analysis
        newAnalysisId = "analysis-" + v4() + "-v" + analysisVersionList.length;
        createAnalysisRequestExtraParams["root_analysis_id"] =
          rootAnalysis.analysis_id;

        createAnalysisRequestExtraParams["direct_parent_id"] =
          analysisVersionList[selectedAnalysisIndex].analysis_id;
      }

      const newAnalysis = {
        analysis_id: newAnalysisId,
        user_question: searchRef.current.input.value,
        createAnalysisRequestBody: {
          // the backend receives an extra param called "other_data" when appending to the table
          other_data: createAnalysisRequestExtraParams,
        },
      };

      const newAnalysisVersionList = [
        ...(rootAnalysis ? analysisVersionList : []),
        newAnalysis,
      ];

      setAnalysisVersionList(newAnalysisVersionList);

      setSelectedAnalysisIndex(newAnalysisVersionList.length - 1);

      setRenderedTabs([
        ...renderedTabs,
        <AnalysisAgent
          key={newAnalysisId}
          analysisId={newAnalysisId}
          createAnalysisRequestBody={newAnalysis.createAnalysisRequestBody}
          username={props.username}
          initiateAutoSubmit={true}
          searchRef={searchRef}
          setGlobalLoading={setLoading}
        />,
      ]);
    } catch (e) {
      message.error("Failed to create analysis: " + e);
    } finally {
      setLoading(false);
    }
  };

  // w-0
  return (
    <div className="flex flex-col bg-gray-50 min-h-96 rounded-md text-gray-600 border border-gray-300">
      <div className="flex grow">
        {selectedAnalysisIndex > -1 && (
          <div className="flex flex-col basis-1/4 mr-4 px-2 pt-5 pb-14 bg-gray-100 rounded-tl-lg relative">
            <h2 className="px-2 mb-3">History</h2>
            <div className="flex flex-col px-2">
              {analysisVersionList.map((version, i) => {
                return (
                  <div
                    key={
                      version.analysis_id +
                      "-" +
                      version.user_question +
                      "-" +
                      i
                    }
                    className={`flex flex-row items-center py-2 px-2 mb-1 hover:cursor-pointer rounded-md hover:bg-gray-200 ${analysisVersionList[selectedAnalysisIndex]?.analysis_id === version.analysis_id ? "font-bold bg-gray-200" : ""}`}
                    onClick={() => {
                      setSelectedAnalysisIndex(i);
                    }}
                  >
                    {version.user_question}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="basis-3/4 rounded-tr-lg pb-14 pt-5 h-full flex flex-col">
          {rootAnalysis &&
            analysisVersionList[selectedAnalysisIndex].analysis_id !==
              "dummy" && (
              <AnalysisAgent
                key={analysisVersionList[selectedAnalysisIndex].analysis_id}
                analysisId={
                  analysisVersionList[selectedAnalysisIndex]?.analysis_id
                }
                createAnalysisRequestBody={
                  analysisVersionList[selectedAnalysisIndex]
                    ?.createAnalysisRequestBody || {}
                }
                username={props.username}
                initiateAutoSubmit={true}
                searchRef={searchRef}
                setGlobalLoading={setLoading}
              />
            )}
        </div>
      </div>
      <div className="sticky bottom-14 z-10">
        <Input
          type="text"
          ref={searchRef}
          onPressEnter={(ev) => {
            handleSubmit();
          }}
          placeholder="Ask a question"
          disabled={loading}
          rootClassName="bg-white absolute mx-auto left-0 right-0 border-2 border-gray-400 -bottom-8 p-2 rounded-lg w-full lg:w-6/12 mx-auto h-16 shadow-custom hover:border-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}

AnalysisVersionViewer.defaultProps = {
  rootAnalysisId: null,
  username: null,
  analysisVersionList: [
    {
      user_question: "New analysis",
      analysis_id: "dummy",
    },
  ],
};

export default AnalysisVersionViewer;
