import React, { useState } from "react";
import { message, Modal, Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import setupBaseUrl from "$utils/setupBaseUrl";

const IMGO = ({ token, apiKeyName }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null); // For managing loading state of individual steps
  const [steps, setSteps] = useState([
    {
      name: "Generate Golden Queries",
      endpoint: "generate_golden_queries_from_questions",
      data: null,
    },
    {
      name: "Check Validity of Generated Golden Queries",
      endpoint: "check_generated_golden_queries_validity",
      data: null,
    },
    {
      name: "Check Correctness of Generated Golden Queries",
      endpoint: "check_generated_golden_queries_correctness",
      data: null,
    },
    { name: "Optimize Glossary", endpoint: "optimize_glossary", data: null },
    { name: "Optimize Metadata", endpoint: "optimize_metadata", data: null },
    {
      name: "Get Recommendations for Glossary and Metadata",
      endpoint: "get_recommendation_for_glossary_and_metadata",
      data: null,
    },
  ]);

  const handleApiRequest = async (index) => {
    console.log("Executing step:", steps[index].name);
    const step = steps[index];
    setLoadingIndex(index); // Set loading state for the current step
    try {
      const res = await fetch(setupBaseUrl("http", step.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          key_name: apiKeyName,
          optimized_glossary: null,
          optimized_metadata: null,
        }),
      });
      const data = await res.json();
      const updatedSteps = [...steps];
      updatedSteps[index].data = data;
      setSteps(updatedSteps);
    } catch (e) {
      console.error(`Error executing step ${step.name}:`, e);
      message.error(`Failed to execute step ${step.name}.`);
    } finally {
      setLoadingIndex(null); // Reset loading state after request completion
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
          {steps.map((step, index) => (
            <div key={index} className="border border-gray-300 p-4 rounded-lg">
              <h3 className="font-bold text-lg">{step.name}</h3>
              <Button
                className="mt-2 mb-4 bg-blue-500 text-white"
                onClick={() => handleApiRequest(index)}
                disabled={loadingIndex === index}
              >
                {loadingIndex === index ? (
                  <Spin
                    indicator={<LoadingOutlined style={{ color: "white" }} />}
                  />
                ) : (
                  "Execute"
                )}
              </Button>
              {step.data && (
                <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default IMGO;
