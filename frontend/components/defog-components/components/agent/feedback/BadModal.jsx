import { CloseOutlined } from "@ant-design/icons";
import { Modal } from "antd";

export default function BadModal({ open, setModalVisible }) {
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
    >Bad Modal
    </Modal>
}