import setupBaseUrl from "./setupBaseUrl";


export const toolboxDisplayNames = {
  cancer_survival: "Cancer Survival",
  data_fetching: "Data Fetching",
  plots: "Plots",
  stats: "Stats",
};

const addToolEndpoint = setupBaseUrl("http", "add_tool");
export const addTool = async ({
  tool_name,
  function_name,
  description,
  code,
  input_metadata,
  output_metadata,
  toolbox,
  no_code = false,
}) => {
  const payload = {
    tool_name,
    function_name,
    description,
    code,
    input_metadata,
    output_metadata,
    toolbox,
    no_code: no_code,
  };
  try {
    const res = await fetch(addToolEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Failed to add tool");
    }

    const json = await res.json();
    return json;
  } catch (e) {
    console.error(e);
    return { success: false, error_message: e };
  }
};
