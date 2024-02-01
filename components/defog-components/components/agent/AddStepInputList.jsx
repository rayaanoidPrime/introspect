import { Input, Select } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { MdDeleteOutline, MdOutlineAddBox } from "react-icons/md";

const inputTypeToUI = {
  list: (
    inputName,
    initialValue,
    onEdit,
    opts = { newListValueDefault: "New Value" }
  ) => {
    if (!initialValue || !Array.isArray(initialValue)) initialValue = [];

    return (
      <span className="tool-input-value tool-input-type-list">
        <span className="list-bracket">[</span>
        {initialValue.map((val, i) => {
          return (
            <span key={inputName}>
              <Input
                defaultValue={val}
                size="small"
                // suffix={
                //   <MdDeleteOutline
                //     onClick={() =>
                //       onEdit(
                //         inputName,
                //         initialValue.filter((v, j) => j !== i)
                //       )
                //     }
                //   />
                // }
                onChange={(ev) => {
                  // replace the value at i with the new value
                  const newVal = initialValue.map((v, j) => {
                    if (i === j) {
                      return ev.target.value;
                    }
                    return v;
                  });
                  onEdit(inputName, newVal);
                }}
              />
              {i !== initialValue.length - 1 ? (
                <span className="list-separator">, </span>
              ) : (
                <></>
              )}
            </span>
          );
        })}
        {/* <div className="list-add">
          <MdOutlineAddBox
            onClick={() => {
              onEdit(inputName, [
                ...initialValue,
                typeof opts.newListValueDefault === "function"
                  ? opts.newListValueDefault()
                  : opts.newListValueDefault,
              ]);
            }}
          ></MdOutlineAddBox>
        </div> */}
        <span className="list-bracket">]</span>
      </span>
    );
  },
  str: (inputName, initialValue, onEdit) => {
    if (!initialValue) initialValue = "";
    return (
      <Input
        rootClassName="tool-input-value"
        defaultValue={initialValue || ""}
        size="small"
        onChange={(ev) => {
          onEdit(inputName, ev.target.value);
        }}
      />
    );
  },
  bool: (inputName, initialValue, onEdit) => {
    return (
      <Select
        rootClassName="tool-input-value"
        placeholder="Select a value"
        defaultValue={initialValue || null}
        size="small"
        popupClassName="tool-input-value-dropdown"
        options={[
          { label: "true", value: true },
          { label: "false", value: false },
        ]}
        onChange={(val) => {
          onEdit(inputName, val);
        }}
      />
    );
  },
  int: (inputName, initialValue, onEdit) => (
    <Input
      rootClassName="tool-input-value"
      defaultValue={initialValue || ""}
      type="number"
      size="small"
      onChange={(ev) => {
        onEdit(inputName, parseFloat(ev.target.value));
      }}
    />
  ),
  float: (inputName, initialValue, onEdit) => (
    <Input
      size="small"
      type="number"
      defaultValue={initialValue}
      onChange={(ev) => {
        onEdit(inputName, parseFloat(ev.target.value));
      }}
    />
  ),
  "pandas.core.frame.DataFrame": (
    inputName,
    initialValue,
    onEdit,
    opts = { availableInputDfs: [] }
  ) => {
    const options = opts.availableInputDfs.map((df) => {
      return { label: df.data.id, value: "global_dict." + df.data.id };
    });

    // return <span className="tool-input-value type-df">{name_clipped}</span>;

    return (
      <Select
        showSearch
        placeholder="Select a value"
        rootClassName="add-step-df-select-ctr"
        onChange={(val) => {
          onEdit(inputName, val);
        }}
        defaultValue={initialValue}
        optionRender={(option) => {
          return (
            <div className="tool-input-data-value">
              <span>{option?.label}</span>
            </div>
          );
        }}
        tagRender={(option) => {
          return (
            <div className="tool-input-data-value">
              <span>{option?.label}</span>
            </div>
          );
        }}
        size="small"
        popupClassName="add-step-df-dropdown"
        options={options}
      />
    );
  },
};

export function AddStepInputList({
  toolRunId,
  toolMetadata,
  availableInputDfs = [],
  inputs = [],
  onEdit = () => {},
  newListValueDefault = "New Value",
}) {
  const functionSignature = toolMetadata?.function_signature || [];

  return (
    <div className="tool-input-list" key={toolRunId}>
      {inputs.map((input, i) => {
        return (
          <div key={i + "_" + toolRunId} className="tool-input">
            <span className="tool-input-type">{functionSignature[i].type}</span>
            <span className="tool-input-name">{functionSignature[i].name}</span>
            {inputTypeToUI[functionSignature[i].type](
              functionSignature[i].name,
              input,
              function (prop, newVal) {
                onEdit(i, prop, newVal);
              },
              {
                availableInputDfs,
                newListValueDefault,
              }
            )}
          </div>
        );
      })}
    </div>
  );
}
