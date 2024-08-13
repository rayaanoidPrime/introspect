import React, { useState } from "react";
import { message, Modal, Button, Spin, Card } from "antd";
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";

const IMGO = ({ token, apiKeyName }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [results, setResults] = useState({});
  const [recommendations, setRecommendations] = useState(null);

  const [optimizedGlossary, setOptimizedGlossary] = useState(null);
  const [optimizedMetadata, setOptimizedMetadata] = useState(null);

  const iterations = [
    {
      title: "Iteration 1: Use Current Metadata and Glossary",
      description: "This iteration uses the current (unoptimized) metadata and glossary for generating golden queries.",
    },
    {
      title: "Iteration 2: Use Optimized Glossary or Metadata",
      description: "This iteration uses either the optimized glossary or optimized metadata, depending on what's available.",
    },
    {
      title: "Iteration 3: Use Both Optimized Glossary and Metadata",
      description: "This iteration uses both the optimized glossary and optimized metadata for generating golden queries.",
    }
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
        optimized_glossary: iteration === 1 ? optimizedGlossary : null,
        optimized_metadata: iteration === 2 ? optimizedMetadata : null,
      }),
    },
    {
      name: "Check Validity of Generated Golden Queries",
      endpoint: "check_generated_golden_queries_validity",
      payload: (iteration) => ({
        token,
        key_name: apiKeyName,
        db_type: "postgres",
        optimized_glossary: iteration === 1 ? optimizedGlossary : null,
        optimized_metadata: iteration === 2 ? optimizedMetadata : null,
      }),
    },
    {
      name: "Check Correctness of Generated Golden Queries",
      endpoint: "check_generated_golden_queries_correctness",
      payload: (iteration) => ({
        token,
        key_name: apiKeyName,
        db_type: "postgres",
        optimized_glossary: iteration === 1 ? optimizedGlossary : null,
        optimized_metadata: iteration === 2 ? optimizedMetadata : null,
      }),
    },
    {
      name: "Optimize Glossary",
      endpoint: "optimize_glossary",
      payload: () => ({
        token,
        key_name: apiKeyName,
      }),
      onSuccess: (data) => setOptimizedGlossary(data.optimized_glossary),
    },
    {
      name: "Optimize Metadata",
      endpoint: "optimize_metadata",
      payload: () => ({
        token,
        key_name: apiKeyName,
      }),
      onSuccess: (data) => setOptimizedMetadata(data.optimized_metadata),
    },
  ];

  const finalStep = {
    name: "Get Recommendations for Glossary and Metadata",
    endpoint: "get_recommendation_for_glossary_and_metadata",
    payload: () => ({
      token,
      key_name: apiKeyName,
      db_type: "postgres",
    }),
  };

  const executeWorkflow = async () => {
    setLoading(true);
    try {
      for (let iteration = 0; iteration < iterations.length; iteration++) {
        for (let step of steps) {
          await handleApiRequest(step, iteration);
        }
      }
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

    try {
      const res = await fetch(setupBaseUrl("http", step.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(step.payload(iteration)),
      });
      const data = await res.json();

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
          let isTaskCompleted = false;
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
            } else {
              console.log(`${step.name} still processing...`);
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          return isTaskCompleted;
        };

        const completed = await pollTaskStatus(task_id);

        if (completed) {
          const finalData = { ...data, finalmessage: "Task completed successfully" };
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
    setLoadingRecommendations(true);
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
    } finally {
      setLoadingRecommendations(false);
    }
  };

  return (
    <>
      <Button onClick={() => setModalVisible(true)} style={{ width: '100%' }}>
        Iterative Metadata and Glossary Optimisation
      </Button>
      <Modal
        title={<div className="text-center mt-4 text-xl">Recommendations for Improving Glossary and Metadata</div>}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)} style={{ width: '100%' }}>
            Close
          </Button>,
        ]}
        width="75%"
        bodyStyle={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="space-y-4">
          <Button
            className="mt-2 mb-4 bg-blue-500 text-white"
            onClick={executeWorkflow}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <Spin
                indicator={<LoadingOutlined style={{ color: "white" }} />}
              />
            ) : (
              "Execute Full Workflow"
            )}
          </Button>

          {iterations.map((iteration, iterationIndex) => (
            <div key={iterationIndex} className="border border-gray-300 p-4 rounded-lg">
              <h3 className="font-bold text-lg">{iteration.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{iteration.description}</p>
              {steps.map((step, stepIndex) => (
                <div
                  key={stepIndex}
                  className="p-2 rounded-lg flex flex-col"
                  style={{
                    borderBottom: stepIndex < steps.length - 1 ? "1px solid #e0e0e0" : "none",
                  }}
                >
                  <div className="flex items-center">
                    <span
                      style={{
                        flexShrink: 0,
                        marginRight: '8px',
                        color:
                          loadingIndex === `${step.name} ${iteration.title}`
                            ? 'orange'
                            : results[`${step.name} ${iteration.title}`]
                              ? 'green'
                              : 'red',
                      }}
                    >
                      {loadingIndex === `${step.name} ${iteration.title}` ? (
                        <Spin indicator={<LoadingOutlined style={{ color: "orange" }} />} />
                      ) : results[`${step.name} ${iteration.title}`] ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )}
                    </span>
                    <span className="flex-1">{step.name}</span>
                    <Button
                      className="bg-blue-500 text-white"
                      onClick={() => handleApiRequest(step, iterationIndex)}
                      disabled={
                        loadingIndex === `${step.name} ${iteration.title}`
                      }
                      style={{ width: '120px' }}
                    >
                      {loadingIndex === `${step.name} ${iteration.title}` ? (
                        <Spin
                          indicator={<LoadingOutlined style={{ color: "white" }} />}
                        />
                      ) : (
                        `Execute`
                      )}
                    </Button>
                  </div>
                  {results[`${step.name} ${iteration.title}`] && (
                    <div className="mt-2 bg-gray-200 text-black p-2 rounded font-mono text-sm">
                      <div>----------</div>
                      {Object.entries(results[`${step.name} ${iteration.title}`])
                        .filter(([key]) => key !== "task_id")
                        .map(([key, value], idx) => (
                          <div key={idx}>
                            {typeof value === 'object' ? (
                              JSON.stringify(value, null, 2)
                            ) : (
                              <span>{value}</span>
                            )}
                          </div>
                        ))}
                      <div>----------</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="border border-gray-300 p-4 rounded-lg">
            <h4 className="font-bold text-md">{finalStep.name}</h4>
            <Button
              className="mt-2 mb-4 bg-green-500"
              onClick={handleFinalRecommendations}
              disabled={loadingRecommendations}
              style={{ width: '100%' }}
            >
              {loadingRecommendations ? (
                <Spin
                  indicator={<LoadingOutlined style={{ color: "white" }} />}
                />
              ) : (
                `Get Final Recommendations`
              )}
            </Button>
            {recommendations && (
              <Card
                title="Final Recommendations"
                className="bg-white shadow-md"
              >
                <p>{recommendations.message}</p>
                <p>Validity Percentages: {recommendations.valid_pct_list.join(", ")}</p>
                <p>Correctness Percentages: {recommendations.correct_pct_list.join(", ")}</p>
                <p>Overall Scores: {recommendations.overall_list.join(", ")}</p>
              </Card>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default IMGO;
