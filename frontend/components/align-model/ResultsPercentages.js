import { Progress, Card } from "antd";

const ResultsPercentages = ({
  validPctList,
  correctPctList,
  overallPctList,
}) => {
  const iterationTitles = [
    "Current Glossary and Metadata",
    "Optimized Glossary and Current Metadata",
    "Current Glossary and Optimized Metadata",
    "Optimized Glossary and Optimized Metadata",
  ];

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-lg mb-4">Percentages:</h4>
      {validPctList.map((validValue, index) => {
        const correctValue = correctPctList[index];
        const overallValue = overallPctList[index];
        return (
          <Card
            key={index}
            className="mb-4 shadow-lg border border-gray-200"
            bodyStyle={{ padding: "20px" }}
            style={{ borderRadius: "10px" }}
          >
            <div className="mb-4 text-center">
              <h5 className="font-semibold text-xl">
                {iterationTitles[index]}
              </h5>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-600 mb-2">Validity:</p>
                <Progress percent={validValue} strokeColor="#1890ff" />
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-2">Correctness:</p>
                <Progress percent={correctValue} strokeColor="#52c41a" />
              </div>
              {/* <div>
                <p className="font-medium text-gray-600 mb-2">Overall:</p>
                <Progress percent={overallValue} strokeColor="#f56a00" />
              </div> */}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default ResultsPercentages;
