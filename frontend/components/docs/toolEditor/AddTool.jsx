import { toolboxDisplayNames } from "$utils/utils";
import { useState } from "react";
import { ToolCreator } from "./ToolCreator";
import Modal from "$components/tailwind/Modal";

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
          setModalOpen(false);
        }}
        footer={null}
        className={"w-8/12"}
      >
        <div>
          <h1 className="text-lg font-bold mb-4">
            Add a tool to the {toolboxDisplayNames[toolbox]} toolbox
          </h1>
          <ToolCreator tool={{ toolbox: toolbox }} onAddTool={onAddTool} />
        </div>
      </Modal>
    </>
  );
}
