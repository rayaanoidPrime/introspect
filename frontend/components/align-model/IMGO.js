import React, { useState } from "react";
import { message, Modal, Button, Spin, Card } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";

const IMGO = ({ token, apiKeyName }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null); // Track which step is loading
  const [loading, setLoading] = useState(false); // For the full workflow button
  const [results, setResults] = useState({}); // Store all results
  const [recommendations, setRecommendations] = useState(null); // Store final recommendations
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [optimizedGlossary, setOptimizedGlossary] = useState(null);
  const [optimizedMetadata, setOptimizedMetadata] = useState(null);

  const iterations = 3; // Number of iterations to run the loop

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
      // Execute the workflow with the full loop and iterations
      for (let iteration = 0; iteration < iterations; iteration++) {
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
    const stepKey = `${step.name} Iteration ${iteration + 1}`; // Use `iteration + 1` for correct 1-based indexing
    setLoadingIndex(stepKey); // Set the loading state for the current step
    try {
      console.log(`Executing ${stepKey}`);
      const res = await fetch(setupBaseUrl("http", step.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(step.payload(iteration)), // Correctly call payload function with iteration
      });
      const data = await res.json();

      // Update results for the specific step
      setResults((prevResults) => ({
        ...prevResults,
        [stepKey]: data,
      }));

      console.log("Set results for", stepKey, ":", data); // Debugging log

      if (step.onSuccess) step.onSuccess(data);
    } catch (e) {
      console.error(`Error executing step ${stepKey}:`, e);
      message.error(`Failed to execute step ${stepKey}.`);
    } finally {
      setLoadingIndex(null); // Reset the loading state
    }
  };

  const handleFinalRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      console.log("Executing final recommendations");
      const res = await fetch(setupBaseUrl("http", finalStep.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalStep.payload()),
      });
      const data = await res.json();
      setRecommendations(data);

      console.log("Final recommendations received:", data); // Debugging log
    } catch (e) {
      console.error("Error fetching final recommendations:", e);
      message.error("Failed to fetch final recommendations.");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  return (
    <>
      <Button onClick={() => setModalVisible(true)}>
        Iterative Metadata and Glossary Optimisation Workflow
      </Button>
      <Modal
        title={<div className="text-center">IMGO Workflow Steps</div>}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        width="75%"
        bodyStyle={{ maxHeight: "80vh", overflowY: "auto" }} // Handle overflow
      >
        <div className="space-y-4">
          {/* Button to trigger full workflow */}
          <Button
            className="mt-2 mb-4 bg-blue-500 text-white"
            onClick={executeWorkflow}
            disabled={loading}
          >
            {loading ? (
              <Spin
                indicator={<LoadingOutlined style={{ color: "white" }} />}
              />
            ) : (
              "Execute Full Workflow"
            )}
          </Button>

          {/* Individual buttons for each step in each iteration */}
          {Array.from({ length: iterations }).map((_, iteration) => (
            <div key={iteration}>
              <h3 className="font-bold text-lg">Iteration {iteration + 1}</h3>
              {steps.map((step, index) => (
                <div key={index} className="border border-gray-300 p-4 rounded-lg">
                  <h4 className="font-bold text-md">{step.name}</h4>
                  <Button
                    className="mt-2 mb-4 bg-blue-500 text-white"
                    onClick={() => handleApiRequest(step, iteration)}
                    disabled={loadingIndex === `${step.name} Iteration ${iteration + 1}`}
                  >
                    {loadingIndex === `${step.name} Iteration ${iteration + 1}` ? (
                      <Spin
                        indicator={<LoadingOutlined style={{ color: "white" }} />}
                      />
                    ) : (
                      `Execute ${step.name}`
                    )}
                  </Button>
                  {results[`${step.name} Iteration ${iteration + 1}`] && (
                    <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(
                        results[`${step.name} Iteration ${iteration + 1}`],
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Separate button for final recommendations */}
          <div className="border border-gray-300 p-4 rounded-lg">
            <h4 className="font-bold text-md">{finalStep.name}</h4>
            <Button
              className="mt-2 mb-4 bg-green-500"
              onClick={handleFinalRecommendations}
              disabled={loadingRecommendations}
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
              <Card title="Final Recommendations" className="bg-white shadow-md">
                <p><strong>Recommendation:</strong> {recommendations.message}</p>
                <p><strong>Validity Percentages:</strong> {recommendations.valid_pct_list.join(", ")}</p>
                <p><strong>Correctness Percentages:</strong> {recommendations.correct_pct_list.join(", ")}</p>
                <p><strong>Overall Scores:</strong> {recommendations.overall_list.join(", ")}</p>
              </Card>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default IMGO;
