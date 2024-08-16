import { Button, Spin } from "antd";

const Instructions = ({
  title,
  description,
  glossary,
  setGlossary,
  updateGlossary,
  updateGlossaryLoadingFunction,
  isLoading,
  isUpdatingInstructions,
}) => (
  <div className="w-full p-4 bg-gray-50 mb-5">
    <h2 className="text-xl mb-3 font-semibold">{title}</h2>
    <p className="mb-4 text-gray-700">{description}</p>
    <Spin
      spinning={isLoading || isUpdatingInstructions}
      tip={
        isUpdatingInstructions
          ? "Updating Instructions..."
          : "Loading Instructions"
      }
    >
      <textarea
        className="w-full h-40 p-2 border rounded border-gray-300 shadow-sm focus:border-gray-500 focus:ring focus:ring-gray-200 transition duration italic"
        value={glossary}
        onChange={(e) => setGlossary(e.target.value)}
        rows={8}
        disabled={isLoading}
      />
    </Spin>
    <Button
      type="primary"
      className="mt-4 p-2 min-w-56"
      onClick={() => updateGlossary(glossary, updateGlossaryLoadingFunction)}
      disabled={isLoading || isUpdatingInstructions}
    >
      Update Glossary
    </Button>
  </div>
);

export default Instructions;
