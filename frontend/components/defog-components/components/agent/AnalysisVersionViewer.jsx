import { Modal, Spin } from "antd";
import { useCallback, useContext, useRef, useState } from "react";
import { v4 } from "uuid";
import { AnalysisAgent } from "./AnalysisAgent";
import { PlusOutlined } from "@ant-design/icons";
import { AnalysisHistoryItem } from "./AnalysisHistoryItem";
import { AnalysisVersionViewerLinks } from "./AnalysisVersionViewerLinks";
import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/20/solid";
import Sidebar from "$components/tailwind/Sidebar";
import { MessageManagerContext } from "$components/tailwind/Message";
import Papa from "papaparse";
import { sentenceCase } from "$utils/utils";
import Table from "$components/tailwind/Table";
import { twMerge } from "tailwind-merge";

function AnalysisVersionViewer({
  dashboards,
  token,
  devMode,
  keyName,
  // this isn't always reinforced
  // we check for this only when we're creating a new analysis
  // but not otherwise
  // the priority is to have the new analysis rendered to not lose the manager
  maxRenderedAnalysis = 2,
  // array of strings
  // each string is a question
  predefinedQuestions = [
    "show me 5 rows and create a heatmap",
    "what is the average of x column",
  ],
}) {
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);

  const messageManager = useContext(MessageManagerContext);

  const [activeRootAnalysisId, setActiveRootAnalysisId] = useState(null); // this is the currently selected root analysis

  // we render these in the history panel and don't unmount them
  // for faster switching between them
  const [last10Analysis, setLast10Analysis] = useState([]); // this is the last 10 analysis

  // an object that stores all analysis in this "session"
  // structure:
  // {
  //  rootAnalysisId: {
  //     root: {
  //       analysisId: "analysis-1",
  //       user_question: "Show me 5 rows",
  //     },
  //     versionList: [
  //       {
  //        analysisId: "analysis-1-v1",
  //        user_question: "Show me 5 rows",
  //        manager: ...
  //       },
  //      ...
  //    ]
  //   }
  //  ...
  // }
  const [sessionAnalyses, setSessionAnalyses] = useState({});
  // just a duplicate of the above but in a flat object
  const [allAnalyses, setAllAnalyses] = useState({});

  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const [addToDashboardSelection, setAddToDashboardSelection] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [didUploadFile, setDidUploadFile] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const uploadFileToServer = async (parsedData) => {
    // upload the file to the server
    setLoading(true);
    console.log(parsedData);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_AGENTS_ENDPOINT}/integration/upload_csv`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: parsedData,
          keyName: keyName,
          token: token,
        }),
      }
    );
    const data = await response.json();
    console.log(data);
    setDidUploadFile(true);
    setLoading(false);
  };

  const handleSubmit = useCallback(
    (question, rootAnalysisId, isRoot, directParentId) => {
      try {
        setLoading(true);

        // if we have an active root analysis, we're appending to that
        // otherwise we're starting a new analysis
        const newId = "analysis-" + v4();
        let newAnalysis = {
          analysisId: newId,
          isRoot: isRoot,
          rootAnalysisId: isRoot ? newId : rootAnalysisId,
          user_question: question,
        };

        newAnalysis.directParentId = directParentId;

        // this is extra stuff we will send to the backend when creating an entry
        // in the db
        let createAnalysisRequestExtraParams = {
          user_question: question,
          is_root_analysis: isRoot,
          root_analysis_id: rootAnalysisId,
          direct_parent_id: directParentId,
        };

        newAnalysis.createAnalysisRequestBody = {
          // the backend receives an extra param called "other_data" when appending to the table
          other_data: createAnalysisRequestExtraParams,
        };

        let newSessionAnalyses = { ...sessionAnalyses };

        // if we have an active root analysis, we're appending to that
        // otherwise we're starting a new root analysis
        if (!rootAnalysisId) {
          setActiveRootAnalysisId(newAnalysis.analysisId);
          newSessionAnalyses[newAnalysis.analysisId] = {
            root: newAnalysis,
            versionList: [newAnalysis],
          };
        } else {
          const rootAnalysis = sessionAnalyses[rootAnalysisId].root;
          newSessionAnalyses[rootAnalysis.analysisId].versionList.push(
            newAnalysis
          );
        }

        console.groupCollapsed("Analysis version viewer");
        console.groupEnd();

        setSessionAnalyses(newSessionAnalyses);
        setActiveAnalysisId(newAnalysis.analysisId);
        setActiveRootAnalysisId(newAnalysis.rootAnalysisId);

        searchRef.current.value = "";

        setAllAnalyses({
          ...allAnalyses,
          [newAnalysis.analysisId]: newAnalysis,
        });

        // remove the earliest one only if we have more than 10
        setLast10Analysis((prev) => {
          if (prev.length >= maxRenderedAnalysis) {
            return [...prev.slice(1), newAnalysis];
          } else {
            return [...prev, newAnalysis];
          }
        });
      } catch (e) {
        messageManager.error("Failed to create analysis");
        console.log(e.stack);
      } finally {
        setLoading(false);
      }
    },
    [sessionAnalyses, allAnalyses]
  );

  // w-0
  return (
    <>
      <div className="relative h-full">
        <div
          className="max-w-full h-full flex flex-col-reverse lg:flex-row bg-white text-gray-600 w-full"
          id="analysis-version-viewer"
        >
          <div className="flex flex-col mr-0 z-10">
            <div className="sticky top-0 z-[10] h-screen">
              <Sidebar
                location="left"
                open={sidebarOpen}
                onChange={(open) => {
                  setSidebarOpen(open);
                }}
                title={<span className="font-bold">History</span>}
                rootClassNames={
                  "transition-all z-20 sticky top-0 h-[calc(100%-1rem)] rounded-md lg:rounded-none lg:rounded-tr-md bg-gray-100 border"
                }
                iconClassNames={`${sidebarOpen ? "" : "text-white bg-primary-highlight"}`}
                openClassNames={"border-gray-300 shadow-md"}
                closedClassNames={
                  "border-transparent bg-transparent shadow-none"
                }
                contentClassNames={
                  // need to add pl-4 here to make the links visible
                  "w-72 px-2 pt-5 pb-14 rounded-tl-lg relative sm:block pl-4 min-h-96 h-full overflow-y-auto"
                }
              >
                <div className="flex flex-col  relative history-list">
                  <AnalysisVersionViewerLinks
                    analyses={allAnalyses}
                    activeAnalysisId={activeAnalysisId}
                  />
                  {Object.keys(sessionAnalyses).map((rootAnalysisId, i) => {
                    const root = sessionAnalyses[rootAnalysisId].root;
                    const analysisVersionList =
                      sessionAnalyses[rootAnalysisId].versionList;

                    return (
                      <div key={root.analysisId}>
                        <AnalysisHistoryItem
                          analysis={root}
                          isActive={activeAnalysisId === root.analysisId}
                          setActiveRootAnalysisId={setActiveRootAnalysisId}
                          setActiveAnalysisId={setActiveAnalysisId}
                          setAddToDashboardSelection={
                            setAddToDashboardSelection
                          }
                        />
                        {analysisVersionList.map((version, i) => {
                          return (
                            <AnalysisHistoryItem
                              key={version.analysisId}
                              analysis={version}
                              isActive={activeAnalysisId === version.analysisId}
                              setActiveRootAnalysisId={setActiveRootAnalysisId}
                              setActiveAnalysisId={setActiveAnalysisId}
                              setAddToDashboardSelection={
                                setAddToDashboardSelection
                              }
                              extraClasses="ml-2 border-l-2"
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                  {!activeRootAnalysisId ? (
                    <AnalysisHistoryItem
                      isDummy={true}
                      setActiveRootAnalysisId={setActiveRootAnalysisId}
                      setActiveAnalysisId={setActiveAnalysisId}
                      isActive={!activeRootAnalysisId}
                    />
                  ) : (
                    <div className="w-full mt-5 sticky bottom-5">
                      <div
                        data-enabled={!loading}
                        className={
                          "cursor-pointer z-20 relative " +
                          "data-[enabled=true]:bg-blue-200 data-[enabled=true]:hover:bg-blue-500 data-[enabled=true]:hover:text-white p-2 data-[enabled=true]:text-blue-400 data-[enabled=true]:shadow-custom " +
                          "data-[enabled=false]:bg-gray-100 data-[enabled=false]:hover:bg-gray-100 data-[enabled=false]:hover:text-gray-400 data-[enabled=false]:text-gray-400 data-[enabled=false]:cursor-not-allowed"
                        }
                        onClick={() => {
                          if (loading) return;
                          // start a new root analysis
                          setActiveRootAnalysisId(null);
                          setActiveAnalysisId(null);
                        }}
                      >
                        New <PlusOutlined />
                      </div>
                      <div className="absolute w-full h-10 bg-gray-100 z-0"></div>
                    </div>
                  )}
                </div>
              </Sidebar>
            </div>
          </div>
          <div
            className="flex flex-col grow rounded-tr-lg pb-14 p-2 md:p-4 relative min-w-0 h-full overflow-scroll"
            onClick={() => {
              setSidebarOpen(false);
            }}
          >
            {activeRootAnalysisId &&
              sessionAnalyses[activeRootAnalysisId].versionList.map(
                (analysis) => {
                  return (
                    <div key={analysis.analysisId}>
                      <AnalysisAgent
                        rootClassNames={
                          "mb-4 ml-3 shadow-md analysis-" + analysis.analysisId
                        }
                        analysisId={analysis.analysisId}
                        createAnalysisRequestBody={
                          analysis.createAnalysisRequestBody
                        }
                        token={token}
                        keyName={keyName}
                        initiateAutoSubmit={true}
                        searchRef={searchRef}
                        setGlobalLoading={setLoading}
                        devMode={devMode}
                        didUploadFile={didUploadFile}
                        onManagerCreated={(mgr, id, ctr) => {
                          // scroll to ctr
                          setTimeout(() => {
                            ctr.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                              inline: "nearest",
                            });
                          }, 200);
                        }}
                        onManagerDestroyed={(mgr, id) => {
                          const data = mgr.analysisData;
                          // remove the analysis from the sessionAnalyses
                          setSessionAnalyses((prev) => {
                            let newSessionAnalyses = { ...prev };
                            if (newSessionAnalyses[id]) {
                              delete newSessionAnalyses[id];
                            } else {
                              const rootAnalysisId = data.root_analysis_id;
                              if (rootAnalysisId) {
                                const rootAnalysis =
                                  newSessionAnalyses[rootAnalysisId];
                                if (rootAnalysis) {
                                  rootAnalysis.versionList =
                                    rootAnalysis.versionList.filter(
                                      (item) => item.analysisId !== id
                                    );
                                }
                              }
                            }

                            return newSessionAnalyses;
                          });
                          setAllAnalyses((prev) => {
                            let newAllAnalyses = { ...prev };
                            if (newAllAnalyses[id]) {
                              delete newAllAnalyses[id];
                            }
                            return newAllAnalyses;
                          });
                          setActiveAnalysisId(null);
                          if (activeRootAnalysisId === id) {
                            setActiveRootAnalysisId(null);
                          }
                        }}
                      />
                    </div>
                  );
                }
              )}

            {!activeAnalysisId && (
              <div className="grow flex flex-col place-content-center w-full m-auto relative z-[1]">
                {didUploadFile !== true ? (
                  <div className="text-center">
                    <p className="text-gray-400 cursor-default font-bold">
                      Quickstart
                    </p>

                    <ul className="text-gray-400">
                      {predefinedQuestions.map((question, i) => (
                        <li className="" key={i}>
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={(ev) => {
                              ev.preventDefault();

                              handleSubmit(
                                sentenceCase(question),
                                activeRootAnalysisId,
                                !activeRootAnalysisId,
                                activeAnalysisId
                              );
                            }}
                          >
                            {sentenceCase(question)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 m-auto">
                  <label
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    htmlFor="file_input"
                  >
                    Upload file
                  </label>
                  <input
                    className="block w-52 text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    id="file_input"
                    type="file"
                    onChange={(ev) => {
                      const file = ev.target.files[0];
                      if (!file) return;

                      // read file as CSV
                      let parsedData = null;
                      Papa.parse(file, {
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                          parsedData = results.data;
                          let columns = parsedData[0];
                          // convert headers from a list of strings to a list of objects, where each object has a title and a dataIndex
                          columns = columns.map((title, i) => ({
                            title: title,
                            dataIndex: i,
                            key: title,
                          }));
                          let data = parsedData.slice(1);
                          data = data.map((row, i) => ({
                            key: i,
                            ...Object.fromEntries(
                              columns.map((col, j) => [col.dataIndex, row[j]])
                            ),
                          }));
                          setTableColumns(columns);
                          setTableData(data);

                          uploadFileToServer(parsedData);
                        },
                      });
                    }}
                  />
                  {didUploadFile === true ? (
                    <Table rows={tableData} columns={tableColumns} />
                  ) : null}
                </div>
              </div>
            )}

            <div className="w-10/12 m-auto lg:w-2/4 fixed bottom-6 left-0 right-0 z-10 bg-white right-0 border-2 border-gray-400 p-2 rounded-lg shadow-custom hover:border-blue-500 focus:border-blue-500 flex flex-row">
              <div className="grow border border-gray-300 rounded-l-md flex items-center">
                <textarea
                  className="w-full border-none bg-transparent py-1.5 text-gray-900 px-2 placeholder:text-gray-400 sm:leading-6 text-sm break-all focus:ring-0 focus:outline-none resize-none"
                  ref={searchRef}
                  disabled={loading}
                  rows={1}
                  onChange={(ev) => {
                    ev.target.style.height = "auto";
                    ev.target.style.height = ev.target.scrollHeight + "px";
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      ev.stopPropagation();

                      // if (!searchRef.current.value) return;

                      handleSubmit(
                        searchRef.current.value,
                        activeRootAnalysisId,
                        !activeRootAnalysisId,
                        activeAnalysisId
                      );
                    }
                  }}
                  placeholder="Type your question here"
                />
              </div>
              <button
                type="button"
                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 p-0 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-blue-500 hover:bg-blue-500 hover:text-white"
                onClick={() => {
                  handleSubmit(
                    searchRef.current.value,
                    activeRootAnalysisId,
                    !activeRootAnalysisId,
                    activeAnalysisId
                  );
                }}
              >
                <ArrowRightEndOnRectangleIcon
                  className="-ml-0.5 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        title="Select the dashboards to add this analysis to"
        open={addToDashboardSelection}
        onOk={() => {
          console.log(selectedDashboards);
          return;
        }}
        onCancel={() => {
          setAddToDashboardSelection(false);
        }}
      >
        <div className="dashboard-selection mt-8 flex flex-col max-h-80 overflow-scroll bg-gray-100 rounded-md">
          {dashboards.map((dashboard) => (
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
