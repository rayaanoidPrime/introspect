import { useState, useEffect, useRef } from "react";
import Instructions from "./Instructions";
import MetadataEditor from "./EditableMetadata";
import { message, Modal, Button, Spin, Card, Slider, Table } from "antd";
import {
  PlayCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";
import { EditableLabel } from "@amcharts/amcharts5";

const IMGO = ({ token, apiKeyName, updateGlossary }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // store the logs/output of each step
  const [results, setResults] = useState({});
  // store the final recommendations
  const dummyRecs = {
    message: "metadata and glossary",
    valid_pct_list: [100, 100, 100, 100],
    correct_pct_list: [100, 100, 100, 100],
  }
  const [recommendations, setRecommendations] = useState(null);

  const [changeGlossary, setChangeGlossary] = useState(false);
  const [changeMetadata, setChangeMetadata] = useState(false);

  const optimizedGlossaryRef = useRef(null);
  const optimizedMetadataRef = useRef(null);

  const [newGlossary, setNewGlossary] = useState("");
  const [newMetadata, setNewMetadata] = useState();

  const [updatingInstructions, setUpdatingInstructions] = useState(false);

  const iterations = [
    {
      title: "Use Current Metadata and Glossary",
      description:
        "Generate, validate, and correct golden queries using the current metadata and glossary. Then optimize both.",
    },
    {
      title: "Use Optimized Glossary and Current Metadata",
      description:
        "Generate, validate, and correct golden queries using the optimized glossary from the first iteration.",
    },
    {
      title: "Use Optimized Metadata and Current Glossary",
      description:
        "Generate, validate, and correct golden queries using the optimized metadata from the first iteration.",
    },
    {
      title: "Use Optimized Metadata and Optimized Glossary",
      description:
        "Generate, validate, and correct golden queries using both the optimized metadata and glossary from previous iterations.",
    },
  ];

  const steps = [
    {
      name: "Generate Golden Queries",
      endpoint: "generate_golden_queries_from_questions",
      payload: (iteration) => ({
        token,
        key_name: apiKeyName,
        max_num_queries: 4,
        db_type: "postgres",
        optimized_glossary: null,
        optimized_metadata: null,
      }),
    },
    {
      name: "Check Validity of the Generated Queries",
      endpoint: "check_generated_golden_queries_validity",
      payload: (iteration) => ({
        token,
        key_name: apiKeyName,
        db_type: "postgres",
        optimized_glossary: null,
        optimized_metadata: null,
      }),
    },
    {
      name: "Check Correctness of the Generated Queries",
      endpoint: "check_generated_golden_queries_correctness",
      payload: (iteration) => ({
        token,
        key_name: apiKeyName,
        db_type: "postgres",
        optimized_glossary: null,
        optimized_metadata: null,
      }),
    },
  ];

  const optimizationSteps = [
    {
      name: "Optimize Glossary",
      endpoint: "optimize_glossary",
      payload: () => ({
        token,
        key_name: apiKeyName,
      }),
    },
    {
      name: "Optimize Metadata",
      endpoint: "optimize_metadata",
      payload: () => ({
        token,
        key_name: apiKeyName,
      }),
    },
  ];

  // this is the final step that will be executed after all iterations- i.e. call to recommendations endpoint
  const finalStep = {
    name: "Recommendations for Glossary and Metadata",
    endpoint: "get_recommendation_for_glossary_and_metadata",
    payload: () => ({
      token,
      key_name: apiKeyName,
      db_type: "postgres",
    }),
  };

  useEffect(() => {
    if (modalVisible) {
      executeWorkflow();
    }
  }, [modalVisible]);

  const executeWorkflow = async () => {
    setLoading(true);
    try {
      for (let iteration = 0; iteration < iterations.length; iteration++) {
        const currentSteps =
          iteration === 0 ? [...steps, ...optimizationSteps] : steps;
        for (let step of currentSteps) {
          await handleApiRequest(step, iteration);
        }
      }
      // Automatically trigger recommendations after workflow steps are completed
      await handleFinalRecommendations();
    } catch (e) {
      console.error("Error during IMGO workflow:", e);
      message.error("Failed during IMGO workflow.");
    } finally {
      setLoading(false);
    }
  };

  const handleApiRequest = async (step, iteration = 0) => {
    const stepKey = `${step.name} ${iterations[iteration].title}`;
    setLoadingIndex(stepKey);
    let payload = step.payload(iteration);

    if (iteration === 1) {
      payload.optimized_glossary = optimizedGlossaryRef.current;
      setNewGlossary(optimizedGlossaryRef.current);
    } else if (iteration === 2) {
      payload.optimized_metadata = optimizedMetadataRef.current;
      setNewMetadata(optimizedMetadataRef.current);
    } else if (iteration === 3) {
      payload.optimized_glossary = optimizedGlossaryRef.current;
      setNewGlossary(optimizedGlossaryRef.current);
      payload.optimized_metadata = optimizedMetadataRef.current;
      setNewMetadata(optimizedMetadataRef.current);
    }

    try {
      const res = await fetch(setupBaseUrl("http", step.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (step.name === "Optimize Glossary") {
        optimizedGlossaryRef.current = data.optimized_glossary;
      } else if (step.name === "Optimize Metadata") {
        optimizedMetadataRef.current = data.optimized_metadata;
      }

      const filteredData = { ...data };
      delete filteredData.task_id;

      setResults((prevResults) => ({
        ...prevResults,
        [stepKey]: filteredData,
      }));

      if (step.onSuccess) step.onSuccess(filteredData);

      const { task_id } = data;
      if (task_id) {
        const pollTaskStatus = async (taskId) => {
          let isTaskCompleted = true;
          while (!isTaskCompleted) {
            const statusRes = await fetch(
              setupBaseUrl("http", "check_task_status"),
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  token,
                  key_name: apiKeyName,
                  task_id: taskId,
                }),
              }
            );
            const statusData = await statusRes.json();

            if (statusData.status === "completed") {
              isTaskCompleted = true;
              return isTaskCompleted;
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          return isTaskCompleted;
        };

        const completed = true; // await pollTaskStatus(task_id);

        if (completed) {
          const finalData = {
            ...data,
            finalmessage: "Task completed successfully ✅",
          };
          delete finalData.task_id;

          setResults((prevResults) => ({
            ...prevResults,
            [stepKey]: finalData,
          }));

          if (step.onSuccess) step.onSuccess(finalData);
        }
      }
    } catch (e) {
      console.error(`Error executing step ${stepKey}:`, e);
      message.error(`Failed to execute step ${stepKey}.`);
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleFinalRecommendations = async () => {
    try {
      const res = await fetch(setupBaseUrl("http", finalStep.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalStep.payload()),
      });
      const data = await res.json();
      setRecommendations(data);
    } catch (e) {
      console.error("Error fetching final recommendations:", e);
      message.error("Failed to fetch final recommendations.");
    }
  };

  const interpretFinalMessage = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("none")) {
      return "We do not have any recommendations for you at this point. Please add more golden queries and check back.";
    }

    if (
      lowerMessage.includes("metadata") &&
      lowerMessage.includes("glossary")
    ) {
      setChangeGlossary(true);
      setChangeMetadata(true);
      return "Recommendations: Focus on improving both Metadata and Glossary.";
    } else if (lowerMessage.includes("metadata")) {
      setChangeMetadata(true);
      return "Recommendations: Focus on improving Metadata.";
    } else if (lowerMessage.includes("glossary")) {
      setChangeGlossary(true);
      return "Recommendations: Focus on improving Glossary.";
    }

    return message;
  };

  const onClose = () => {
    setModalVisible(false);
    setLoading(false);
    setResults({});
    setRecommendations(null);
  };

  return (
    <>
      <Button onClick={() => setModalVisible(true)} style={{ width: "100%" }}>
        Iterative Metadata and Glossary Optimisation
      </Button>
      <Modal
        title={
          <div className="text-2xl font-semibold text-center mt-2 mb-4">
            Recommendations for Improving Glossary and Metadata
          </div>
        }
        visible={modalVisible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose} style={{ width: "100%" }}>
            Close
          </Button>,
        ]}
        width="75%"
        bodyStyle={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="space-y-4">
          {recommendations ? (
            <Card title="Final Recommendations" className="bg-white shadow-md">
              <p className="mb-2 font-semibold text-lg">
                {interpretFinalMessage(recommendations.message)}
              </p>
              {true && (
                <Instructions
                  title="Optimized Glossary"
                  description="These are the optimized glossary recommendations. You can edit them below before accepting changes."
                  glossary={newGlossary}
                  setGlossary={setNewGlossary}
                  updateGlossary={updateGlossary}
                  updateGlossaryLoadingFunction={setUpdatingInstructions}
                  isLoading={false}
                  isUpdatingInstructions={updatingInstructions}
                />
              )}
              <MetadataEditor
                metadata={newMetadata}
                onUpdate={setNewMetadata}
              />
              <div className="mt-4">
                <h4 className="font-semibold">Percentages:</h4>
                {recommendations.valid_pct_list.map((value, index) => (
                  <div key={index} className="mt-2">
                    <p>Iteration {index + 1} Validity:</p>
                    <Slider value={value} max={100} />
                  </div>
                ))}
                {recommendations.correct_pct_list.map((value, index) => (
                  <div key={index} className="mt-2">
                    <p>Iteration {index + 1} Correctness:</p>
                    <Slider value={value} max={100} />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="text-center italic text-lg">
              Your recommendations will appear here after the workflow is done
              running. Please bear with us as we run multiple iterations to
              provide you with the best recommendations. This can take a few
              minutes.
            </div>
          )}

          {iterations.map((iteration, iterationIndex) => (
            <div
              key={iterationIndex}
              className="border border-gray-300 p-4 rounded-lg"
            >
              <h3 className="font-semibold text-lg">{iteration.title}</h3>
              <p className="text-sm text-gray-600 mb-4 mt-1">
                {iteration.description}
              </p>
              {(iterationIndex === 0
                ? [...steps, ...optimizationSteps]
                : steps
              ).map((step, stepIndex) => (
                <div
                  key={stepIndex}
                  className="rounded-lg flex flex-col"
                  style={{
                    borderBottom:
                      stepIndex < steps.length - 1
                        ? "1px solid #e0e0e0"
                        : "none",
                  }}
                >
                  <div className="flex items-center flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white mt-3">
                    <span
                      style={{
                        flexShrink: 0,
                        marginRight: "8px",
                        color:
                          loadingIndex === `${step.name} ${iteration.title}`
                            ? "orange"
                            : results[`${step.name} ${iteration.title}`]
                              ? "green"
                              : "red",
                      }}
                    >
                      {loadingIndex === `${step.name} ${iteration.title}` ? (
                        <Spin
                          indicator={
                            <LoadingOutlined style={{ color: "orange" }} />
                          }
                        />
                      ) : results[`${step.name} ${iteration.title}`] ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )}
                    </span>
                    <span className="flex-1">{step.name}</span>
                  </div>

                  {results[`${step.name} ${iteration.title}`] && (
                    <div className="mt-2 bg-black text-white p-4 rounded font-mono text-sm overflow-auto max-h-96">
                      {Object.entries(
                        results[`${step.name} ${iteration.title}`]
                      )
                        .filter(([key]) => key !== "task_id")
                        .map(([key, value], idx) => (
                          <div key={idx}>
                            {typeof value === "object" ? (
                              <pre>{JSON.stringify(value, null, 2)}</pre>
                            ) : (
                              <span>{value}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default IMGO;
