import { Modal } from "antd";
import StepsDag from "../../common/StepsDag";
import { useState } from "react";

export default function BadModal({ open, setModalVisible, analysisSteps }) {

    const [dag, setDag] = useState(null);
    const [dagLinks, setDagLinks] = useState([]);

    return <Modal
        title="To improve the model, could you please give more details about why this is a bad plan? :)"
        open={open}
        footer={null}
        onCancel={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setModalVisible(null)
        }}
        centered
    >
        <StepsDag
            steps={analysisSteps}
            nodeRadius={5}
            dag={dag}
            setDag={setDag}
            setDagLinks={setDagLinks}
            dagLinks={dagLinks}
            skipAddStepNode={true}
        />
    </Modal>
}