import { toolboxDisplayNames } from "$utils/utils";
import { Modal } from "antd";
import { useState } from "react";
import { ToolEditor } from "./ToolEditor";

export default function AddTool({ toolbox, onAddTool = (...args) => {} }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className="tool rounded mr-3 mb-3  bg-blue-50 border border-blue-400 flex items-center p-3 cursor-pointer hover:shadow-lg"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center  justify-center text-blue-500">
          <span className="">
            <p className="m-0">+</p>
          </span>
        </div>
      </div>
      <Modal
        open={modalOpen}
        onCancel={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setModalOpen(null);
        }}
        footer={null}
        centered
        className={"w-8/12"}
      >
        <div>
          <h1 className="text-lg font-bold mb-4">
            Add a tool to the {toolboxDisplayNames[toolbox]} toolbox
          </h1>
          <ToolEditor tool={{ toolbox: toolbox }} onAddTool={onAddTool} />
        </div>
      </Modal>
    </>
  );
}
