import { Input, Modal, message } from "antd";
import { useRef, useState } from "react";
import { v4 } from "uuid";
import { AnalysisAgent } from "./AnalysisAgent";
import { PlusOutlined } from "@ant-design/icons";
import { appendAnalysisToYjsDoc } from "../../../../utils/utils";
import setupBaseUrl from "../../../../utils/setupBaseUrl";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import YPartyKitProvider from "y-partykit/provider";

const defaultProps = {
  rootAnalysisId: null,
  username: null,
  dashboards: [],
  analysisVersionList: [
    {
      user_question: "New analysis",
      analysis_id: "dummy",
    },
  ],
};

const partyEndpoint = process.env.NEXT_PUBLIC_AGENTS_ENDPOINT;

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

  const [rootAnalysis, setRootAnalysis] = useState(props?.rootAnalysisId); // this is the root analysis

  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const [addToDashboardSelection, setAddToDashboardSelection] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState([]);

  const managerCreatedHook = (manager, analysisId) => {
    // add manager to analysisVersionList
    let newAnalysisVersionList = analysisVersionList.map((item) => {
      if (item.analysis_id === analysisId) {
        return {
          ...item,
          manager,
        };
      }
      return item;
    });

    setAnalysisVersionList(newAnalysisVersionList);
  };

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
      let newAnalysisVersionList = [
        ...(rootAnalysis ? analysisVersionList : []),
      ];
      let directParentIndex = selectedAnalysisIndex;

      // check if the last analysis is not a dummy analysis
      // and either:
      // doesn't have gen_steps as the nextStage
      // or has gen_steps as the nextStage but the gen_steps is empty
      // if so, delete this from the list and create a new analysis
      const lastAnalysis =
        newAnalysisVersionList?.[newAnalysisVersionList.length - 1];
      const lastAnalysisData = lastAnalysis?.manager?.analysisData;

      if (
        lastAnalysis &&
        lastAnalysisData &&
        lastAnalysis.analysis_id !== "dummy" &&
        // either no steps or non existent steps
        !lastAnalysisData?.gen_steps?.steps?.length
      ) {
        console.log(
          "the last analysis was still at clarify stage, deleting it and starting a fresh one"
        );
        newAnalysisVersionList = newAnalysisVersionList.slice(
          0,
          newAnalysisVersionList.length - 1
        );
        directParentIndex = newAnalysisVersionList.length - 1;
      }

      let newAnalysisId = null;

      // this is extra stuff we will send to the backend when creating an entry
      // in the db
      let createAnalysisRequestExtraParams = {
        user_question: searchRef.current.input.value,
        // if rootAnalysis is not defined, means we're starting something from scratch
        is_root_analysis: !rootAnalysis,
      };

      if (!rootAnalysis || directParentIndex === -1) {
        newAnalysisId = "analysis-" + v4();
        setRootAnalysis({
          analysis_id: newAnalysisId,
          user_question: searchRef.current.input.value,
        });
        createAnalysisRequestExtraParams.is_root_analysis = true;
      } else {
        // else create a follow up analysis
        newAnalysisId =
          "analysis-" + v4() + "-v" + newAnalysisVersionList.length;
        createAnalysisRequestExtraParams["root_analysis_id"] =
          rootAnalysis.analysis_id;

        createAnalysisRequestExtraParams["direct_parent_id"] =
          newAnalysisVersionList[directParentIndex].analysis_id;
      }

      const newAnalysis = {
        analysis_id: newAnalysisId,
        user_question: searchRef.current.input.value,
        createAnalysisRequestBody: {
          // the backend receives an extra param called "other_data" when appending to the table
          other_data: createAnalysisRequestExtraParams,
        },
      };
      console.groupCollapsed("Analysis version viewer");
      console.log("directParentIndex", directParentIndex);
      console.log("old list: ", analysisVersionList);
      console.log("newAnalysisVersionList", newAnalysisVersionList);
      console.log("rootAnalysis", rootAnalysis);
      console.log("newAnalysis", newAnalysis);
      console.groupEnd();

      newAnalysisVersionList = [...newAnalysisVersionList, newAnalysis];

      setAnalysisVersionList(newAnalysisVersionList);

      setSelectedAnalysisIndex(newAnalysisVersionList.length - 1);
    } catch (e) {
      message.error("Failed to create analysis: " + e);
    } finally {
      setLoading(false);
    }
  };

  // w-0
  return (
    <>
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
                      className={
                        "flex flex-row items-center py-2 px-2 mb-1 hover:cursor-pointer rounded-md hover:bg-gray-200 " +
                        `${analysisVersionList[selectedAnalysisIndex]?.analysis_id === version.analysis_id ? "font-bold bg-gray-200 " : ""}`
                      }
                      onClick={() => {
                        setSelectedAnalysisIndex(i);
                      }}
                    >
                      <div className="grow">{version.user_question}</div>
                      {version.analysis_id !== "dummy" && !loading && (
                        <div
                          className="rounded-sm hover:bg-blue-500 p-1 flex justify-center hover:text-white"
                          onClick={() => {
                            console.log(version.analysis_id);
                            setSelectedAnalysisIndex(i);
                            // add this to a dashboard
                            setAddToDashboardSelection(version);
                          }}
                        >
                          <PlusOutlined />
                        </div>
                      )}
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
                  managerCreatedHook={managerCreatedHook}
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
      <Modal
        title="Select the dashboards to add this analysis to"
        open={addToDashboardSelection}
        onOk={() => {
          console.log(selectedDashboards);
          selectedDashboards.forEach((dashboardId) => {
            const dashboard = props.dashboards.find(
              (dashboard) => dashboard.doc_id === dashboardId
            );

            if (!dashboard) return;

            const analysisId =
              analysisVersionList[selectedAnalysisIndex].analysis_id;
            const docId = dashboard.doc_id;
            const docTitle = dashboard.doc_title;

            try {
              const newDoc = new Doc();
              // connect to partykit to flush updates to all connected editors + the backend
              const yjsProvider = new YPartyKitProvider(
                partyEndpoint,
                docId,
                newDoc,
                {
                  params: {
                    doc_id: docId,
                    username: v4(),
                  },
                  protocol: "ws",
                }
              );

              yjsProvider.on("sync", () => {
                // appendAnalysisToYjsDoc(yjsProvider.doc, analysisId);
              });

              // yjsProvider.doc.on("update", () => {
              //   console.log(
              //     "update: ",
              //     yjsProvider.doc
              //       .getXmlFragment("document-store")
              //       .firstChild.toJSON()
              //   );
              // });
              // console.log("synced", docId);
              // console.log(yjsProvider.doc.toJSON());
              // // appendAnalysisToYjsDoc(newDoc, docTitle, analysisId);
              // console.log("Adding analysis to dashboard", dashboardId);
              // });
            } catch (e) {
              message.error("Failed to add analysis to dashboard " + e);
            }
          });
          setAddToDashboardSelection(false);
        }}
        onCancel={() => {
          setAddToDashboardSelection(false);
        }}
      >
        <div className="dashboard-selection mt-8 flex flex-col max-h-80 overflow-scroll bg-gray-100 rounded-md">
          {props.dashboards.map((dashboard) => (
            <div
              className={
                "flex flex-row p-2 hover:bg-gray-200 cursor-pointer text-gray-400 items-start " +
                (selectedDashboards.includes(dashboard.doc_id) &&
                  "text-gray-600 font-bold")
              }
              key={dashboard.doc_id}
              onClick={() => {
                if (selectedDashboards.includes(dashboard.doc_id)) {
                  setSelectedDashboards(
                    selectedDashboards.filter(
                      (item) => item !== dashboard.doc_id
                    )
                  );
                } else {
                  setSelectedDashboards([
                    ...selectedDashboards,
                    dashboard.doc_id,
                  ]);
                }
              }}
            >
              <div className="checkbox mr-3">
                <input
                  // style input to have no background and a black tick
                  className="appearance-none w-3 h-3 border border-gray-300 rounded-md checked:bg-blue-600 checked:border-transparent"
                  type="checkbox"
                  checked={selectedDashboards.includes(dashboard.doc_id)}
                  readOnly
                />
              </div>
              <div className="grow">{dashboard.doc_title}</div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

export default AnalysisVersionViewer;
