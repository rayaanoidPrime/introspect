import { Progress } from "antd";

const ResultsPercentages = ({ validPctList, correctPctList }) => {
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Percentages:</h4>
      {validPctList.map((validValue, index) => {
        const correctValue = correctPctList[index];
        return (
          <div key={index} className="mt-2 flex justify-between">
            <div className="w-1/2 pr-2">
              <p>Iteration {index + 1} Validity:</p>
              <Progress percent={validValue} />
            </div>
            <div className="w-1/2 pl-2">
              <p>Iteration {index + 1} Correctness:</p>
              <Progress percent={correctValue} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ResultsPercentages;
