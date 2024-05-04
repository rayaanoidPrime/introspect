import { CloseOutlined } from "@ant-design/icons";
import { Modal } from "antd";

export default function GoodModal({ open, setModalVisible }) {
    return <Modal
        title="To improve the model, could you please give more details about why this is a good plan? :)"
        open={open}
        footer={null}
        onCancel={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setModalVisible(null)
        }}
        centered
    >
        Good Modal
    </Modal>
}